"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  envoyerNotificationPush,
  envoyerNotificationAuxAdmins,
  type PayloadPush,
} from "@/lib/push/notifications";
import { notifierNouvelleActiviteLead, notifierNouveauLead } from "@/lib/email/notifications";
import { envoyerEmail } from "@/lib/email/envoyerEmail";
import { verifierRateLimit } from "@/lib/securite/rateLimiter";
import { upsertLeadEtContact, normalizePhone } from "@/lib/leads/upsert";

// ── Validation ────────────────────────────────────────────────────────────────

function emailValide(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function telephoneValide(tel: string): boolean {
  const chiffres = tel.replace(/[\s\-+().]/g, "");
  return /^\d{8,15}$/.test(chiffres);
}

// ── IP ────────────────────────────────────────────────────────────────────────

async function lireIP(): Promise<string> {
  const hdrs = await headers();
  return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

// ── Throttle email ────────────────────────────────────────────────────────────

async function nbSoumissionsRecentes(bienId: string): Promise<number> {
  const admin = createAdminClient();
  const depuis = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("demandes_visite")
    .select("id", { count: "exact", head: true })
    .eq("bien_id", bienId)
    .gte("created_at", depuis);
  return count ?? 0;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type DonneesDemandeVisite = {
  bienId: string;
  agentId: string | null;
  titreBien: string;
  nomClient: string;
  emailClient: string;
  telephoneClient: string | null;
  dateSouhaitee: string;
  message: string | null;
  siteWeb?: string; // champ honeypot — doit rester vide pour les humains
};

export async function soumettreDemandeVisite(donnees: DonneesDemandeVisite) {
  // Couche 1 — Honeypot : si rempli, c'est un bot → fausse réussite silencieuse
  if (donnees.siteWeb) return;

  // Couche 2 — Rate limiting par IP (5 soumissions / 10 min)
  const ip = await lireIP();
  if (!verifierRateLimit(`${ip}-contact`, 5, 10 * 60 * 1000)) {
    throw new Error("Trop de soumissions. Veuillez patienter quelques minutes avant de réessayer.");
  }

  // Couche 3 — Validation serveur
  const nom = donnees.nomClient.trim();
  const email = donnees.emailClient.trim();
  const tel = donnees.telephoneClient?.trim() ?? null;

  if (!nom || nom.length > 100) throw new Error("Nom invalide.");
  if (!emailValide(email)) throw new Error("Adresse email invalide.");
  if (tel !== null && !telephoneValide(tel)) throw new Error("Numéro de téléphone invalide.");
  if (donnees.message && donnees.message.length > 2000) throw new Error("Message trop long (max 2000 caractères).");
  if (!donnees.dateSouhaitee) throw new Error("Date requise.");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { error } = await admin.from("demandes_visite").insert({
    bien_id: donnees.bienId,
    agent_id: donnees.agentId,
    client_id: user?.id ?? null,
    nom_client: nom,
    email_client: email,
    telephone_client: tel,
    date_souhaitee: donnees.dateSouhaitee,
    message: donnees.message,
    statut: "nouvelle",
  });
  if (error) throw new Error(error.message);

  // Couche 4 — Throttle email : max 3 notifications email / 30 min par bien
  const nbRecents = await nbSoumissionsRecentes(donnees.bienId);
  const envoyerEmail = nbRecents <= 3;

  const payload: PayloadPush = {
    titre: "Nouvelle demande de visite",
    corps: `${nom} — ${donnees.titreBien}`,
    url: "/pro/leads",
  };
  const taches: Promise<void>[] = [envoyerNotificationAuxAdmins(payload)];
  if (envoyerEmail) {
    taches.push(
      notifierNouvelleActiviteLead({
        type: "visite",
        titreBien: donnees.titreBien,
        nomClient: nom,
        emailClient: email,
        telephoneClient: tel,
        message: donnees.message,
        dateSouhaitee: donnees.dateSouhaitee,
      })
    );
  } else {
    console.warn(`[notifications] Email supprimé (throttle) — ${nbRecents} soumissions récentes pour bien ${donnees.bienId}`);
  }
  if (donnees.agentId) taches.push(envoyerNotificationPush(donnees.agentId, payload));
  for (const resultat of await Promise.allSettled(taches)) {
    if (resultat.status === "rejected") console.error("[notifications] soumettreDemandeVisite :", resultat.reason);
  }
}

export type DonneesMessage = {
  bienId: string;
  agentId: string | null;
  titreBien: string;
  nomClient: string;
  emailClient: string;
  telephoneClient: string | null;
  message: string;
  siteWeb?: string; // champ honeypot — doit rester vide pour les humains
};

export async function soumettreMessage(donnees: DonneesMessage) {
  // Couche 1 — Honeypot
  if (donnees.siteWeb) return;

  // Couche 2 — Rate limiting par IP
  const ip = await lireIP();
  if (!verifierRateLimit(`${ip}-contact`, 5, 10 * 60 * 1000)) {
    throw new Error("Trop de soumissions. Veuillez patienter quelques minutes avant de réessayer.");
  }

  // Couche 3 — Validation serveur
  const nom = donnees.nomClient.trim();
  const email = donnees.emailClient.trim();
  const tel = donnees.telephoneClient?.trim() ?? null;
  const message = donnees.message.trim();

  if (!nom || nom.length > 100) throw new Error("Nom invalide.");
  if (!emailValide(email)) throw new Error("Adresse email invalide.");
  if (tel !== null && !telephoneValide(tel)) throw new Error("Numéro de téléphone invalide.");
  if (!message || message.length > 2000) throw new Error("Message invalide (max 2000 caractères).");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { error } = await admin.from("demandes_visite").insert({
    bien_id: donnees.bienId,
    agent_id: donnees.agentId,
    client_id: user?.id ?? null,
    nom_client: nom,
    email_client: email,
    telephone_client: tel,
    date_souhaitee: null,
    message,
    statut: "nouvelle",
  });
  if (error) throw new Error(error.message);

  // Couche 4 — Throttle email
  const nbRecents = await nbSoumissionsRecentes(donnees.bienId);
  const envoyerEmail = nbRecents <= 3;

  const payload: PayloadPush = {
    titre: "Nouveau message client",
    corps: `${nom} — ${donnees.titreBien}`,
    url: "/pro/leads",
  };
  const taches: Promise<void>[] = [envoyerNotificationAuxAdmins(payload)];
  if (envoyerEmail) {
    taches.push(
      notifierNouvelleActiviteLead({
        type: "message",
        titreBien: donnees.titreBien,
        nomClient: nom,
        emailClient: email,
        telephoneClient: tel,
        message,
        dateSouhaitee: null,
      })
    );
  } else {
    console.warn(`[notifications] Email supprimé (throttle) — ${nbRecents} soumissions récentes pour bien ${donnees.bienId}`);
  }
  if (donnees.agentId) taches.push(envoyerNotificationPush(donnees.agentId, payload));
  for (const resultat of await Promise.allSettled(taches)) {
    if (resultat.status === "rejected") console.error("[notifications] soumettreMessage :", resultat.reason);
  }
}

// ── Demande de rappel (« Demander à être recontacté ») ───────────────────────
// Crée un LEAD via le pipeline partagé (contact dédoublonné, anti-doublon 24 h)
// et le rattache directement au conseiller du bien (agent_id + statut
// « transmis », même pattern que l'affectation admin) : il apparaît dans
// /pro/leads du conseiller ET dans /admin/leads pour le suivi d'activité.

export type DonneesDemandeRappel = {
  bienId: string;
  nom: string;
  prenom: string | null;
  telephone: string;
  siteWeb?: string; // champ honeypot — doit rester vide pour les humains
};

export async function demanderRappel(donnees: DonneesDemandeRappel) {
  // Couche 1 — Honeypot : si rempli, c'est un bot → fausse réussite silencieuse
  if (donnees.siteWeb) return;

  // Couche 2 — Rate limiting par IP (même compteur que les autres formulaires)
  const ip = await lireIP();
  if (!verifierRateLimit(`${ip}-contact`, 5, 10 * 60 * 1000)) {
    throw new Error("Trop de soumissions. Veuillez patienter quelques minutes avant de réessayer.");
  }

  // Couche 3 — Validation serveur
  const nom = donnees.nom.trim();
  const prenom = donnees.prenom?.trim() || null;
  if (!nom || nom.length > 100) throw new Error("Nom invalide.");
  if (prenom && prenom.length > 100) throw new Error("Prénom invalide.");
  const telephone = normalizePhone(donnees.telephone);
  if (!telephone) throw new Error("Numéro de téléphone invalide.");

  // Le bien fait foi côté serveur (agent_id jamais pris du client)
  const admin = createAdminClient();
  const { data: bien } = await admin
    .from("biens")
    .select("id, titre, reference, transaction, agent_id")
    .eq("id", donnees.bienId)
    .single();
  if (!bien) throw new Error("Bien introuvable.");

  const nomComplet = [prenom, nom].filter(Boolean).join(" ");
  const typeProjet = bien.transaction === "location" ? "location" : "achat";

  const { leadId, doublon } = await upsertLeadEtContact({
    nom: nomComplet,
    prenom,
    telephone,
    typeProjet,
    source: "fiche_bien",
    bienId: bien.id,
    message: "Demande de rappel — souhaite être recontacté(e) au numéro indiqué.",
  });

  // Doublon récent (même téléphone + même bien < 24 h) : la demande est déjà
  // chez le conseiller — succès pour le visiteur, sans re-notifier.
  if (doublon) return;

  // Rattachement direct au conseiller du bien → sort de la file d'affectation
  let conseiller: { email: string | null; nom_complet: string | null } | null = null;
  if (bien.agent_id) {
    const { error: eMaj } = await admin
      .from("leads")
      .update({ agent_id: bien.agent_id, statut: "transmis" })
      .eq("id", leadId);
    if (eMaj) {
      console.error("[rappel] rattachement au conseiller échoué (lead en file) :", eMaj);
    } else {
      const { data: profil } = await admin
        .from("profils")
        .select("email, nom_complet")
        .eq("id", bien.agent_id)
        .single();
      conseiller = profil ?? null;
    }
  }

  // Notifications — best-effort, jamais bloquantes
  const payload: PayloadPush = {
    titre: "📞 Demande de rappel",
    corps: `${nomComplet} (${telephone}) — ${bien.titre}`,
    url: "/pro/leads",
  };
  const taches: Promise<void>[] = [
    envoyerNotificationAuxAdmins(payload),
    // Email admin — suivi de l'activité des conseillers
    notifierNouveauLead({
      nom: nomComplet,
      telephone,
      email: null,
      typeProjet,
      budget: null,
      financement: null,
      delai: null,
      profilClient: null,
      zones: null,
      source: "fiche_bien",
      titreBien: `${bien.titre}${bien.reference ? ` (${bien.reference})` : ""}${conseiller?.nom_complet ? ` — conseiller : ${conseiller.nom_complet}` : " — aucun conseiller affecté (file)"}`,
      score: null,
    }),
  ];
  if (bien.agent_id) taches.push(envoyerNotificationPush(bien.agent_id, payload));
  if (conseiller?.email) {
    taches.push(
      envoyerEmail({
        destinataire: conseiller.email,
        sujet: `📞 Demande de rappel — ${bien.titre}`,
        texte: [
          "Un visiteur demande à être recontacté au sujet d'un de vos biens.",
          "",
          `Bien : ${bien.titre}${bien.reference ? ` (${bien.reference})` : ""}`,
          `Nom : ${nomComplet}`,
          `Téléphone : ${telephone}`,
          "",
          "Retrouvez ce lead dans votre espace : https://pro.hoomy.ma/pro/leads",
        ].join("\n"),
      })
    );
  }
  for (const resultat of await Promise.allSettled(taches)) {
    if (resultat.status === "rejected") console.error("[notifications] demanderRappel :", resultat.reason);
  }
}
