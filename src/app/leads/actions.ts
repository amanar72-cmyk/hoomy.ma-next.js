"use server";

// Soumission publique d'un lead qualifié.
//
// Sécurité (même pattern que les demandes de visite) :
//   1. Honeypot invisible (siteWeb) — bot → fausse réussite silencieuse
//   2. Délai minimal de 3 s entre affichage et soumission
//   3. Rate limiting par IP (5 leads / 10 min)
//   4. Whitelist stricte des valeurs (doublée par les CHECK en base)
//
// Insertion via la fonction PARTAGÉE upsertLeadEtContact (lib/leads/upsert) :
// fiche contact dédoublonnée par téléphone, résolution du bien, anti-doublon,
// statut 'nouveau'. Les validations strictes ci-dessous restent la barrière
// d'entrée publique. Le score est GÉNÉRÉ par la base — jamais écrit par le
// code ; il n'est relu (client admin) que pour l'email de notification.

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifierRateLimit } from "@/lib/securite/rateLimiter";
import { notifierNouveauLead } from "@/lib/email/notifications";
import { upsertLeadEtContact } from "@/lib/leads/upsert";

// ── Valeurs autorisées (miroir des CHECK en base) ─────────────────────────────

const TYPES_PROJET = ["achat", "location", "vente"] as const;
const FINANCEMENTS = ["cash", "credit_accord", "credit_a_monter", "a_definir"] as const;
const DELAIS = ["moins_3_mois", "entre_3_6_mois", "plus_6_mois"] as const;
const PROFILS = ["mre", "local"] as const;
const SOURCES = ["site", "fiche_bien", "accueil", "estimation", "meta_ads", "whatsapp"] as const;

// Tranches canoniques de budget par type de projet (texte libre en base)
const BUDGETS_ACHAT = ["<500k", "500k-1M", "1-2M", "2M+"] as const;
const BUDGETS_LOCATION = ["<3k/mois", "3-6k/mois", "6-10k/mois", "10k+/mois"] as const;

export type TypeProjet = (typeof TYPES_PROJET)[number];

export type DonneesLead = {
  typeProjet: string;
  budget: string | null;
  financement: string | null;
  delai: string | null;
  profilClient: string | null;
  zones: string[];
  nom: string;
  telephone: string;
  email: string | null;
  message: string | null;
  source: string;
  bienId: string | null;
  titreBien?: string | null; // uniquement pour l'email de notification
  afficheA: number;          // Date.now() au montage du formulaire (anti-bot)
  siteWeb?: string;          // honeypot — doit rester vide
};

// ── Validation ────────────────────────────────────────────────────────────────

function emailValide(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function telephoneValide(tel: string): boolean {
  const chiffres = tel.replace(/[\s\-+().]/g, "");
  return /^\d{8,15}$/.test(chiffres);
}

function estUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

async function lireIP(): Promise<string> {
  const hdrs = await headers();
  return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function dansListe<T extends readonly string[]>(liste: T, v: string): v is T[number] {
  return (liste as readonly string[]).includes(v);
}

// ── Action ────────────────────────────────────────────────────────────────────

/**
 * ok=true UNIQUEMENT pour un vrai lead nouvellement enregistré. Les « fausses
 * réussites silencieuses » (honeypot, timing bot, doublon) renvoient ok=false :
 * l'UI affiche quand même le succès (ne pas révéler l'anti-spam au bot, ne pas
 * inquiéter l'humain qui double-clique), mais l'appelant sait ne PAS déclencher
 * de tracking (Pixel Lead, GA lead_submit) sur ces cas.
 */
export type ResultatSoumission = { ok: boolean };

export async function soumettreLead(donnees: DonneesLead): Promise<ResultatSoumission> {
  // 1. Honeypot : rempli → bot → fausse réussite silencieuse
  if (donnees.siteWeb) return { ok: false };

  // 2. Soumission trop rapide après affichage (< 3 s) → bot
  const ecoule = Date.now() - donnees.afficheA;
  if (!Number.isFinite(ecoule) || ecoule < 3000) return { ok: false };

  // 3. Rate limiting par IP
  const ip = await lireIP();
  if (!verifierRateLimit(`${ip}-lead`, 5, 10 * 60 * 1000)) {
    throw new Error("Trop de soumissions. Veuillez patienter quelques minutes.");
  }

  // 4. Validation stricte
  const nom = donnees.nom.trim();
  const telephone = donnees.telephone.trim();
  const email = donnees.email?.trim() || null;
  const message = donnees.message?.trim() || null;

  if (!nom || nom.length > 100) throw new Error("Veuillez indiquer votre nom.");
  if (!telephone || !telephoneValide(telephone)) throw new Error("Numéro de téléphone invalide.");
  if (email && !emailValide(email)) throw new Error("Adresse email invalide.");
  if (message && message.length > 1000) throw new Error("Message trop long (max 1000 caractères).");

  if (!dansListe(TYPES_PROJET, donnees.typeProjet)) throw new Error("Type de projet invalide.");
  const typeProjet = donnees.typeProjet;

  // Budget : tranches propres au type ; sans objet pour une vente
  let budget: string | null = null;
  if (typeProjet !== "vente" && donnees.budget) {
    const tranches = typeProjet === "achat" ? BUDGETS_ACHAT : BUDGETS_LOCATION;
    if (!dansListe(tranches, donnees.budget)) throw new Error("Budget invalide.");
    budget = donnees.budget;
  }

  // Financement : uniquement pour un achat
  let financement: string | null = null;
  if (typeProjet === "achat" && donnees.financement) {
    if (!dansListe(FINANCEMENTS, donnees.financement)) throw new Error("Financement invalide.");
    financement = donnees.financement;
  }

  let delai: string | null = null;
  if (donnees.delai) {
    if (!dansListe(DELAIS, donnees.delai)) throw new Error("Délai invalide.");
    delai = donnees.delai;
  }

  let profilClient: string | null = null;
  if (donnees.profilClient) {
    if (!dansListe(PROFILS, donnees.profilClient)) throw new Error("Profil invalide.");
    profilClient = donnees.profilClient;
  }

  const zones = donnees.zones
    .map((z) => z.trim())
    .filter((z) => z.length > 0 && z.length <= 60)
    .slice(0, 6);

  const source = dansListe(SOURCES, donnees.source) ? donnees.source : "site";
  const bienId = donnees.bienId && estUUID(donnees.bienId) ? donnees.bienId : null;

  // ── Insertion via la fonction PARTAGÉE (contact + bien + lead) ────────────
  // upsertLeadEtContact centralise : normalisation +212, fiche contact
  // dédoublonnée par téléphone, résolution du bien, anti-doublon 24 h,
  // statut 'nouveau' (file d'affectation). Le score reste généré par la base.
  let id: string;
  try {
    const resultat = await upsertLeadEtContact({
      nom,
      telephone,
      email,
      typeProjet,
      budget,
      financement,
      delai,
      profilClient,
      zones,
      message,
      source,
      bienId,
    });
    id = resultat.leadId;
    // Doublon récent (double-clic, re-soumission) : succès silencieux, pas
    // de second email de notification — et pas de second tir Pixel/GA (le lead
    // d'origine les a déjà déclenchés).
    if (resultat.doublon) return { ok: false };
  } catch {
    throw new Error("Impossible d'enregistrer votre demande. Réessayez dans un instant.");
  }

  // ── Notification email (best-effort, ne bloque jamais la soumission) ──────
  try {
    const admin = createAdminClient();
    const { data: lead } = await admin
      .from("leads")
      .select("score")
      .eq("id", id)
      .maybeSingle();

    await notifierNouveauLead({
      nom,
      telephone,
      email,
      typeProjet,
      budget,
      financement,
      delai,
      profilClient,
      zones: zones.length > 0 ? zones : null,
      source,
      titreBien: donnees.titreBien ?? null,
      score: (lead as { score: string | null } | null)?.score ?? null,
    });
  } catch (e) {
    console.error("[leads] notification email échouée :", e);
  }

  // Vrai lead enregistré → l'appelant peut déclencher le tracking.
  return { ok: true };
}
