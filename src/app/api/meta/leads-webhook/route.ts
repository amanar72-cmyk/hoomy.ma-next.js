import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { upsertLeadEtContact } from "@/lib/leads/upsert";

// WEBHOOK Meta Lead Ads — branchement DIRECT (sans Make).
//
// Flux : Meta notifie un `leadgen_id` (PAS les données) → on récupère les
// champs du formulaire via le Graph API → on confie tout à la fonction
// partagée upsertLeadEtContact (téléphone +212, contact dédoublonné,
// anti-doublon par leadgen_id, statut 'nouveau', scoring calculé en base).
// L'anti-doublon rend ce webhook compatible avec le chemin Make existant
// (/api/leads/meta) pendant la transition : le même lead n'entre qu'une fois.
//
// Sécurité :
//  - GET  : vérification Meta (hub.challenge si hub.verify_token correspond)
//  - POST : signature X-Hub-Signature-256 (HMAC-SHA256 du corps BRUT avec
//           META_APP_SECRET) vérifiée en temps constant, sinon 401
//  - Réponse 200 IMMÉDIATE à Meta, traitement en asynchrone (serveur Node
//    persistant sur Hostinger : la promesse détachée continue après la
//    réponse) — Meta désactive les webhooks qui répondent lentement/en échec.
// Tokens 100 % côté serveur — jamais exposés au navigateur.

export const runtime = "nodejs";
export const maxDuration = 30;

const GRAPH_API = "https://graph.facebook.com/v21.0";
const TIMEOUT_GRAPH_MS = 10_000;

// ── GET : vérification du webhook (poignée de main Meta) ─────────────────────

export async function GET(req: NextRequest) {
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (!verifyToken) {
    console.error("[meta webhook] META_WEBHOOK_VERIFY_TOKEN non configurée.");
    return new Response("Non configuré", { status: 503 });
  }

  const sp = req.nextUrl.searchParams;
  if (sp.get("hub.mode") === "subscribe" && sp.get("hub.verify_token") === verifyToken) {
    // Meta attend le challenge en texte brut, tel quel
    return new Response(sp.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Token de vérification invalide", { status: 403 });
}

// ── Signature X-Hub-Signature-256 ─────────────────────────────────────────────

/** Vérifie « sha256=<hmac du corps brut> » en temps constant. */
function signatureValide(corpsBrut: string, entete: string | null, appSecret: string): boolean {
  if (!entete || !entete.startsWith("sha256=")) return false;
  const attendu = createHmac("sha256", appSecret).update(corpsBrut, "utf8").digest("hex");
  const a = Buffer.from(entete.slice("sha256=".length));
  const b = Buffer.from(attendu);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ── Récupération du lead via le Graph API ────────────────────────────────────

type ChampFormulaire = { name: string; values: string[] };
type LeadGraph = {
  id: string;
  created_time?: string;
  field_data?: ChampFormulaire[];
  ad_id?: string;
  ad_name?: string;
  campaign_name?: string;
  form_id?: string;
};

async function recupererLead(leadgenId: string, accessToken: string): Promise<LeadGraph> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_GRAPH_MS);
  try {
    const url =
      `${GRAPH_API}/${encodeURIComponent(leadgenId)}` +
      `?fields=id,created_time,field_data,ad_id,ad_name,campaign_name,form_id` +
      `&access_token=${encodeURIComponent(accessToken)}`;
    const rep = await fetch(url, { signal: ctrl.signal });
    const donnees = await rep.json();
    if (!rep.ok) {
      throw new Error(
        `Graph API ${rep.status} : ${donnees?.error?.message ?? "réponse inattendue"}`
      );
    }
    return donnees as LeadGraph;
  } finally {
    clearTimeout(t);
  }
}

// ── Mapping des champs du formulaire ──────────────────────────────────────────

/** Clé de champ normalisée : minuscules, sans accents, alphanumérique + _. */
function normaliserCle(cle: string): string {
  return cle
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
}

/** Première valeur du premier champ dont la clé normalisée contient TOUS les mots. */
function chercherChamp(champs: Map<string, string>, ...mots: string[]): string | null {
  for (const [cle, valeur] of champs) {
    if (mots.every((m) => cle.includes(m))) return valeur;
  }
  return null;
}

/** « immédiat / 3 mois / juste curieux » → colonne delai (alimente le scoring). */
function intentionVersDelai(intention: string | null): string | null {
  if (!intention) return null;
  const v = normaliserCle(intention);
  if (v.includes("imm")) return "moins_3_mois";          // vend immédiatement
  if (v.includes("3") || v.includes("mois")) return "entre_3_6_mois";
  if (v.includes("curieu")) return "plus_6_mois";        // juste curieux
  return null;
}

// ── Traitement d'une notification leadgen (asynchrone, jamais bloquant) ──────

async function traiterLeadgen(leadgenId: string, accessToken: string): Promise<void> {
  try {
    const lead = await recupererLead(leadgenId, accessToken);

    // field_data → Map clé normalisée → valeur
    const champs = new Map<string, string>();
    for (const c of lead.field_data ?? []) {
      const valeur = (c.values ?? [])[0]?.trim();
      if (valeur) champs.set(normaliserCle(c.name), valeur);
    }

    const nom = chercherChamp(champs, "full_name") ?? chercherChamp(champs, "nom") ?? "";
    // Téléphone absent/mal saisi : gardé quand même (statut 'a_verifier' via
    // permettreSansTelephone) plutôt que perdu — corrigeable sur
    // /admin/leads/a-verifier.
    const telephone =
      chercherChamp(champs, "phone") ?? chercherChamp(champs, "telephone") ?? "";

    const typeBien = chercherChamp(champs, "type", "bien") ?? chercherChamp(champs, "type_de_bien");
    const quartier = chercherChamp(champs, "quartier") ?? chercherChamp(champs, "secteur");
    const intention = chercherChamp(champs, "intention") ?? chercherChamp(champs, "vente", "quand");

    // Résumé lisible pour le conseiller (type de bien : pas de colonne dédiée)
    const message = [
      typeBien ? `Type de bien : ${typeBien}` : null,
      quartier ? `Quartier : ${quartier}` : null,
      intention ? `Intention de vente : ${intention}` : null,
    ]
      .filter(Boolean)
      .join(" · ") || null;

    const resultat = await upsertLeadEtContact({
      nom,
      telephone,
      typeProjet: "vente",                    // campagne vendeurs/propriétaires
      delai: intentionVersDelai(intention),   // alimente le scoring hot/warm/cold
      zones: quartier ? [quartier] : null,
      message,
      source: "meta_ads",
      campagne: lead.campaign_name ?? lead.ad_name ?? null,
      metaLeadId: lead.id,                    // anti-doublon (unique en base)
      metaAdId: lead.ad_id ?? null,
      metaFormId: lead.form_id ?? null,
      permettreSansTelephone: true,
    });

    console.log(
      `[meta webhook] lead ${leadgenId} → ${resultat.doublon ? "doublon ignoré" : `créé (${resultat.leadId})`}`
    );
  } catch (e) {
    // Jamais de crash : on logge de façon exploitable (leadgen_id retrouvable
    // dans le gestionnaire de pub Meta si un rejeu manuel est nécessaire)
    console.error(`[meta webhook] échec traitement lead ${leadgenId} :`, e);
  }
}

// ── POST : notifications leadgen ──────────────────────────────────────────────

type NotificationMeta = {
  entry?: { changes?: { field?: string; value?: { leadgen_id?: string } }[] }[];
};

export async function POST(req: NextRequest) {
  const appSecret = process.env.META_APP_SECRET;
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN;
  if (!appSecret || !accessToken) {
    console.error("[meta webhook] META_APP_SECRET ou META_PAGE_ACCESS_TOKEN manquante.");
    return NextResponse.json({ erreur: "Non configuré." }, { status: 503 });
  }

  // 1. Corps BRUT d'abord — la signature porte sur les octets exacts
  const corpsBrut = await req.text();

  // 2. Signature Meta obligatoire (rejet des appels forgés)
  if (!signatureValide(corpsBrut, req.headers.get("x-hub-signature-256"), appSecret)) {
    console.warn("[meta webhook] signature X-Hub-Signature-256 invalide — rejeté.");
    return NextResponse.json({ erreur: "Signature invalide." }, { status: 401 });
  }

  // 3. Extraction des leadgen_id
  let leadgenIds: string[] = [];
  try {
    const corps = JSON.parse(corpsBrut) as NotificationMeta;
    leadgenIds = (corps.entry ?? [])
      .flatMap((e) => e.changes ?? [])
      .filter((c) => c.field === "leadgen" && c.value?.leadgen_id)
      .map((c) => c.value!.leadgen_id!) ;
  } catch {
    // Corps illisible mais signé : on acquitte quand même (rien à traiter)
    return NextResponse.json({ ok: true });
  }

  // 4. 200 IMMÉDIAT à Meta ; traitement détaché (le serveur Node persistant
  //    de Hostinger continue d'exécuter la promesse après la réponse)
  for (const id of leadgenIds) {
    void traiterLeadgen(id, accessToken);
  }

  return NextResponse.json({ ok: true, recus: leadgenIds.length });
}
