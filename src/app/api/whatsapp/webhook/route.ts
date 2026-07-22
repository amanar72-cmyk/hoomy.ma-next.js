import { NextRequest } from "next/server";
import twilio from "twilio";
import { genererReponseAgent, type CriteresAgent } from "@/lib/agent/cerveau";
import {
  trouverOuCreerConversation,
  chargerHistorique,
  enregistrerMessage,
  enregistrerMemoire,
  normaliserTelephone,
} from "@/lib/agent/conversation";
import { creerDemandeVisiteWhatsApp } from "@/lib/agent/visite";
import { creerLeadWhatsApp } from "@/lib/agent/lead";

// Mémoire persistée (JSONB) élargie de bits de bookkeeping propres à ce
// webhook : cerveau.ts l'ignore totalement (fusionnerCriteres ne connaît que
// CLES_CRITERES) — ces champs ne vivent que côté persistance, gérés ici.
//   - visite_creee : une fois une visite créée pour un rendez-vous convenu, on
//     ne veut PAS en recréer une à chaque message suivant ("merci", "parfait"...)
//     tant que le client ne propose pas un NOUVEAU créneau.
//   - lead_cree : un seul lead par conversation, même si nom/prénom/besoin
//     restent connus (donc la condition resterait vraie) sur tous les tours suivants.
//   - refs_montrees : biens déjà envoyés au client, pour ne jamais les reproposer.
type MemoireEtendue = Partial<CriteresAgent> & {
  visite_creee?: boolean;
  lead_cree?: boolean;
  refs_montrees?: string[];
};

/** Source par défaut faute de mécanisme de contexte publicitaire (referral Meta) branché. */
const SOURCE_LEAD_WHATSAPP = "whatsapp";

// WEBHOOK WhatsApp (Twilio sandbox) — reçoit les messages entrants et répond
// via le CERVEAU partagé de l'agent (src/lib/agent/cerveau.ts).
//
// - Twilio envoie du form-urlencoded : Body (texte du client) + From
//   (whatsapp:+212...).
// - Sécurité : signature X-Twilio-Signature validée avec TWILIO_AUTH_TOKEN
//   (validateRequest). Désactivable temporairement via
//   TWILIO_VALIDATE_SIGNATURE=false (sandbox capricieux) — activée par défaut.
// - MÉMOIRE : la conversation (fil + critères accumulés) est persistée via
//   src/lib/agent/conversation.ts, avec la clé service_role — Twilio est un
//   service externe, il n'y a AUCUNE session utilisateur ici.
// - Si le client vient de convenir d'un créneau de visite précis (jour+heure),
//   une demande de visite RÉELLE est créée (demandes_visite, statut 'nouvelle')
//   + notification push/email — voir src/lib/agent/visite.ts.
// - Dès que prénom + nom + un besoin (intention acheteur/vendeur) sont connus,
//   un LEAD réel est créé une fois par conversation — voir src/lib/agent/lead.ts.
//   Ni l'un ni l'autre côté simulateur admin (/api/agent/simulateur), qui
//   n'importe aucune de ces deux fonctions.
// - Toujours 200 + TwiML vide : la réponse au client part par l'API REST
//   Twilio, pas par le TwiML (permettra plusieurs messages plus tard).
// Credentials 100 % serveur — jamais exposées au navigateur.

export const runtime = "nodejs";
export const maxDuration = 60; // deux appels IA avant l'envoi Twilio

const MESSAGE_REPLI =
  "Un instant, je transmets votre demande à un conseiller. — HOOMY";

// Limite WhatsApp : 1600 caractères par message
const LONGUEUR_MAX = 1600;

/** TwiML vide — accuse réception à Twilio sans y mettre la réponse. */
function twimlVide(status = 200): Response {
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status,
    headers: { "Content-Type": "text/xml" },
  });
}

/** Préfixe whatsapp: si absent (tolère un TWILIO_WHATSAPP_NUMBER nu). */
function numeroWhatsApp(brut: string): string {
  return brut.startsWith("whatsapp:") ? brut : `whatsapp:${brut}`;
}

/** Éclate un ISO (UTC) en date/heure LOCALES Maroc — pour l'email, lisible par un humain. */
function versDateHeureMaroc(iso: string): { date: string; heure: string } {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Casablanca" }).format(d); // AAAA-MM-JJ
  const heure = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Casablanca", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d);
  return { date, heure };
}

/**
 * URL publique telle que signée par Twilio : derrière le proxy (Hostinger),
 * req.url pointe sur localhost — on reconstruit avec les en-têtes forwarded.
 */
function urlPublique(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  return `${proto}://${host}${req.nextUrl.pathname}`;
}

export async function POST(req: NextRequest) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const numeroHoomy = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!accountSid || !authToken || !numeroHoomy) {
    console.error("[whatsapp] variables TWILIO_* manquantes — webhook désactivé.");
    return twimlVide(503);
  }

  // ── Lecture du form-urlencoded Twilio ───────────────────────────────────────
  let params: Record<string, string> = {};
  try {
    const form = await req.formData();
    params = Object.fromEntries(
      [...form.entries()].map(([k, v]) => [k, typeof v === "string" ? v : ""])
    );
  } catch {
    return twimlVide(400);
  }

  // ── Validation de la signature Twilio (403 si invalide) ─────────────────────
  // TWILIO_VALIDATE_SIGNATURE=false pour désactiver temporairement (sandbox).
  const validerSignature = process.env.TWILIO_VALIDATE_SIGNATURE !== "false";
  if (validerSignature) {
    const signature = req.headers.get("x-twilio-signature") ?? "";
    const valide = twilio.validateRequest(authToken, signature, urlPublique(req), params);
    if (!valide) {
      console.warn("[whatsapp] signature Twilio invalide — requête rejetée.");
      return new Response("Signature invalide", { status: 403 });
    }
  }

  const body = (params.Body ?? "").trim();
  const from = params.From ?? "";

  // Callbacks de statut ou payloads sans message texte : on acquitte sans agir
  if (!body || !from.startsWith("whatsapp:")) {
    return twimlVide();
  }

  // ── Cerveau + envoi de la réponse (repli poli en cas d'échec) ───────────────
  const client = twilio(accountSid, authToken);

  let texteReponse = MESSAGE_REPLI;
  // conversationId reste null si la base est en échec : on répond quand même,
  // sans mémoire, plutôt que de laisser le client sans réponse.
  let conversationId: string | null = null;

  try {
    const conversation = await trouverOuCreerConversation(from, "whatsapp");
    conversationId = conversation.id;

    // Historique chargé AVANT d'enregistrer le message courant : sinon le
    // dernier message se retrouverait à la fois dans l'historique et en entrée.
    const historique = await chargerHistorique(conversation.id);
    await enregistrerMessage(conversation.id, "client", body);

    const memoireAvant = conversation.memoire as MemoireEtendue;

    const resultat = await genererReponseAgent({
      message: body,
      historique,
      memoire: conversation.memoire,
      refsDejaMontrees: memoireAvant.refs_montrees ?? [],
    });

    if (resultat.reponse.trim()) {
      texteReponse = resultat.reponse.trim().slice(0, LONGUEUR_MAX);
    }

    // Biens déjà montrés : mis à jour à CHAQUE tour (contrairement aux bits
    // ci-dessous, qui ne passent qu'une fois de false à true).
    const memoireAPersister: MemoireEtendue = {
      ...resultat.memoire,
      refs_montrees: resultat.refsMontrees,
      visite_creee: memoireAvant.visite_creee,
      lead_cree: memoireAvant.lead_cree,
    };

    // ── Visite convenue : crée la demande réelle (jamais côté simulateur) ─────
    if (resultat.visite.confirmee && !memoireAvant.visite_creee) {
      try {
        const { creee } = await creerDemandeVisiteWhatsApp({
          telephone: normaliserTelephone(from),
          nomClient: resultat.memoire.prenom ?? null,
          visite: resultat.visite,
        });
        if (creee) memoireAPersister.visite_creee = true;
      } catch (e) {
        console.error("[whatsapp] création demande de visite échouée :", e);
      }
    }

    // ── Lead qualifié : prénom + nom + besoin identifié (intention connue),
    //    une seule fois par conversation (jamais côté simulateur) ────────────
    const { nom, prenom } = resultat.criteres;
    if (!memoireAvant.lead_cree && nom && prenom && resultat.intention !== "autre") {
      try {
        // Bien qui intéresse le client : celui d'une visite en cours de
        // discussion en priorité, sinon le premier bien montré (meilleure
        // approximation disponible sans demander explicitement au client).
        const bienInteresse = resultat.visite.bien_ref ?? resultat.refsMontrees[0] ?? null;

        await creerLeadWhatsApp({
          telephone: normaliserTelephone(from),
          criteres: resultat.criteres,
          intention: resultat.intention,
          source: SOURCE_LEAD_WHATSAPP,
          bienInteresse,
          biensProposes: resultat.refsMontrees,
          visiteSouhaitee: resultat.visite.date_iso ? versDateHeureMaroc(resultat.visite.date_iso) : null,
          resume: resultat.resume,
        });
        memoireAPersister.lead_cree = true;
      } catch (e) {
        console.error("[whatsapp] création lead échouée :", e);
      }
    }

    await enregistrerMemoire(conversation.id, memoireAPersister);
  } catch (e) {
    // Cerveau ou base en échec : on log et on part sur le repli poli.
    console.error("[whatsapp] cerveau/mémoire en échec :", e);
  }

  let envoye = false;
  try {
    await client.messages.create({
      from: numeroWhatsApp(numeroHoomy),
      to: from, // Twilio fournit déjà le préfixe whatsapp:
      body: texteReponse,
    });
    envoye = true;
  } catch (e) {
    // Échec d'envoi Twilio : rien d'autre à faire que logger — on acquitte
    // quand même en 200 pour éviter les retries en rafale de Twilio.
    console.error("[whatsapp] envoi Twilio en échec :", e);
  }

  // La réponse n'est mémorisée que si le client l'a VRAIMENT reçue : sinon
  // l'agent croirait avoir dit une chose que le client n'a jamais lue.
  if (envoye && conversationId) {
    try {
      await enregistrerMessage(conversationId, "agent", texteReponse);
    } catch (e) {
      console.error("[whatsapp] enregistrement réponse en échec :", e);
    }
  }

  return twimlVide();
}
