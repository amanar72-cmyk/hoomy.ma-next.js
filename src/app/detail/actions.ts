"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  envoyerNotificationPush,
  envoyerNotificationAuxAdmins,
  type PayloadPush,
} from "@/lib/push/notifications";
import { notifierNouvelleActiviteLead } from "@/lib/email/notifications";
import { verifierRateLimit } from "@/lib/securite/rateLimiter";

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
