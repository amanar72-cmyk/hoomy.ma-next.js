import "server-only";

// Fonction PARTAGÉE d'ingestion des leads — appelée par TOUTES les sources
// (formulaire site via la server action, Meta via /api/leads/meta, landing via
// /api/leads). Elle centralise :
//   1. la normalisation du téléphone au format +212 (normalizePhone, testable) ;
//   2. l'upsert de la FICHE CONTACT par téléphone (création ou réutilisation,
//      complétion des champs vides uniquement) ;
//   3. la résolution du bien : référence HM-XXXX → bien_id (bien_ref en secours) ;
//   4. l'insertion du LEAD (statut 'nouveau' = file d'affectation) ;
//   5. l'idempotence : meta_lead_id UNIQUE + garde-fou applicatif 24 h.
//
// Le SCORE n'est JAMAIS écrit ici : c'est une colonne générée par la base à
// partir de type_projet / financement / delai / profil_client.
// Client service_role uniquement (bypass RLS) — jamais importable côté client.

import { createAdminClient } from "@/lib/supabase/admin";

// ── Valeurs autorisées (miroir des CHECK en base — défensif) ──────────────────
const TYPES_PROJET = ["achat", "location", "vente"] as const;
const FINANCEMENTS = ["cash", "credit_accord", "credit_a_monter", "a_definir"] as const;
const DELAIS = ["moins_3_mois", "entre_3_6_mois", "plus_6_mois"] as const;
const PROFILS = ["mre", "local"] as const;
const SOURCES = ["site", "fiche_bien", "accueil", "estimation", "meta_ads", "whatsapp"] as const;

function siDansListe(liste: readonly string[], v: string | null | undefined): string | null {
  const t = v?.trim().toLowerCase() ?? "";
  return t && liste.includes(t) ? t : null;
}

// ── Normalisation du téléphone au format +212 ─────────────────────────────────

/**
 * Normalise un numéro marocain vers +212XXXXXXXXX.
 *  - retire espaces, points, tirets, parenthèses
 *  - 00212… / 212… / 0X XX XX XX XX → +212…
 *  - un numéro international non marocain plausible est conservé tel quel
 * Retourne null si le numéro est inexploitable.
 */
export function normalizePhone(brut: string | null | undefined): string | null {
  let t = (brut ?? "").replace(/[\s.\-()]/g, "");
  if (!t) return null;
  if (t.startsWith("00")) t = `+${t.slice(2)}`;

  if (/^\+212[5-8]\d{8}$/.test(t)) return t;              // déjà normalisé
  if (/^212[5-8]\d{8}$/.test(t)) return `+${t}`;           // 2126… → +2126…
  if (/^0[5-8]\d{8}$/.test(t)) return `+212${t.slice(1)}`; // 06… → +2126…
  if (/^\+\d{8,15}$/.test(t)) return t;                    // autre international

  return null;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type LeadEntrant = {
  nom: string;
  prenom?: string | null;
  telephone: string;
  email?: string | null;
  typeProjet?: string | null;   // achat | location | vente (défaut : achat)
  budget?: string | null;
  financement?: string | null;
  delai?: string | null;
  profilClient?: string | null;
  zones?: string[] | null;
  message?: string | null;
  source: string;               // whitelist SOURCES (défaut : site)
  campagne?: string | null;
  bienRef?: string | null;      // référence HM-XXXX (Meta)
  bienId?: string | null;       // uuid direct (formulaire site)
  metaLeadId?: string | null;   // leadgen_id Meta → idempotence forte
  // Traçabilité publicitaire (webhook Meta direct) — colonnes meta_ad_id /
  // meta_form_id (voir meta_leads_webhook.sql). Insérées uniquement si
  // fournies : les autres chemins (Make, site) ne sont pas concernés.
  metaAdId?: string | null;
  metaFormId?: string | null;
};

export type ResultatUpsert = {
  leadId: string;
  contactId: string | null;
  doublon: boolean; // true = lead déjà connu, rien de nouveau inséré
};

function estUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

// ── Upsert contact + insertion lead ───────────────────────────────────────────

export async function upsertLeadEtContact(payload: LeadEntrant): Promise<ResultatUpsert> {
  const admin = createAdminClient();

  // 0. Champs de base
  const telephone = normalizePhone(payload.telephone);
  if (!telephone) throw new Error("Numéro de téléphone invalide.");

  const nom = (payload.nom ?? "").trim().slice(0, 100) || "(sans nom)";
  const prenom = payload.prenom?.trim().slice(0, 100) || null;
  const email = payload.email?.trim().slice(0, 254) || null;
  const message = payload.message?.trim().slice(0, 1000) || null;
  const campagne = payload.campagne?.trim().slice(0, 200) || null;
  const metaLeadId = payload.metaLeadId?.trim().slice(0, 100) || null;

  const source = siDansListe(SOURCES, payload.source) ?? "site";
  // type_projet alimente le scoring (NOT NULL en base) — défaut prudent : achat
  const typeProjet = siDansListe(TYPES_PROJET, payload.typeProjet) ?? "achat";
  const financement = siDansListe(FINANCEMENTS, payload.financement);
  const delai = siDansListe(DELAIS, payload.delai);
  const profilClient = siDansListe(PROFILS, payload.profilClient);
  const budget = payload.budget?.trim().slice(0, 40) || null;
  const zones = (payload.zones ?? [])
    .map((z) => z.trim())
    .filter((z) => z.length > 0 && z.length <= 60)
    .slice(0, 6);

  // 1. Idempotence forte : lead Meta déjà reçu (Make peut renvoyer 2 fois)
  if (metaLeadId) {
    const { data: deja, error } = await admin
      .from("leads")
      .select("id, contact_id")
      .eq("meta_lead_id", metaLeadId)
      .maybeSingle();
    if (error) {
      console.error("[leads] lecture meta_lead_id échouée :", error);
      throw new Error("Erreur interne (idempotence).");
    }
    if (deja) return { leadId: deja.id, contactId: deja.contact_id ?? null, doublon: true };
  }

  // 2. Upsert du CONTACT par téléphone (complète uniquement les champs vides)
  let contactId: string | null = null;
  {
    const { data: existant, error } = await admin
      .from("contacts")
      .select("id, nom, prenom, email")
      .eq("telephone", telephone)
      .maybeSingle();
    if (error) {
      console.error("[leads] lecture contact échouée :", error);
      throw new Error("Erreur interne (contact).");
    }

    if (existant) {
      contactId = existant.id;
      const maj: Record<string, unknown> = {};
      if (!existant.nom && nom !== "(sans nom)") maj.nom = nom;
      if (!existant.prenom && prenom) maj.prenom = prenom;
      if (!existant.email && email) maj.email = email;
      if (Object.keys(maj).length > 0) {
        maj.maj_le = new Date().toISOString();
        const { error: eMaj } = await admin.from("contacts").update(maj).eq("id", existant.id);
        if (eMaj) console.error("[leads] complétion contact échouée (non bloquant) :", eMaj);
      }
    } else {
      const { data: cree, error: eIns } = await admin
        .from("contacts")
        .insert({ nom, prenom, email, telephone })
        .select("id")
        .single();
      if (eIns) {
        // Course possible (deux leads simultanés) : 23505 = unique_violation → relire
        if (eIns.code === "23505") {
          const { data: relu } = await admin
            .from("contacts").select("id").eq("telephone", telephone).maybeSingle();
          contactId = relu?.id ?? null;
        }
        if (!contactId) {
          console.error("[leads] création contact échouée :", eIns);
          throw new Error("Erreur interne (contact).");
        }
      } else {
        contactId = cree.id;
      }
    }
  }

  // 3. Résolution du bien : bien_id direct, sinon référence HM-XXXX → id
  let bienId = payload.bienId && estUUID(payload.bienId) ? payload.bienId : null;
  let bienRef = payload.bienRef?.trim().toUpperCase().slice(0, 30) || null;
  if (!bienId && bienRef) {
    const { data: bien } = await admin
      .from("biens").select("id, reference").ilike("reference", bienRef).maybeSingle();
    if (bien) { bienId = bien.id; bienRef = bien.reference; }
    // Bien introuvable : on garde bien_ref en secours (affichable côté admin)
  } else if (bienId && !bienRef) {
    const { data: bien } = await admin
      .from("biens").select("reference").eq("id", bienId).maybeSingle();
    bienRef = bien?.reference ?? null;
  }

  // 4. Garde-fou anti-doublon applicatif : même téléphone + même bien + même
  //    source dans les dernières 24 h → on renvoie le lead existant
  {
    const depuis = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    let q = admin
      .from("leads")
      .select("id, contact_id")
      .eq("telephone", telephone)
      .eq("source", source)
      .gte("cree_le", depuis)
      .limit(1);
    if (bienId) q = q.eq("bien_id", bienId);
    else if (bienRef) q = q.eq("bien_ref", bienRef);
    else q = q.is("bien_id", null);
    const { data: recent } = await q;
    if (recent && recent.length > 0) {
      return { leadId: recent[0].id, contactId: recent[0].contact_id ?? contactId, doublon: true };
    }
  }

  // 5. Insertion du LEAD — statut 'nouveau' = entre dans la file d'affectation.
  //    Le score est calculé par la base ; on ne l'écrit jamais.
  const { data: lead, error: eLead } = await admin
    .from("leads")
    .insert({
      nom,
      telephone,
      email,
      type_projet: typeProjet,
      budget,
      financement,
      delai,
      profil_client: profilClient,
      zones: zones.length > 0 ? zones : null,
      message,
      source,
      campagne,
      bien_ref: bienRef,
      bien_id: bienId,
      contact_id: contactId,
      meta_lead_id: metaLeadId,
      statut: "nouveau",
      // Colonnes de traçabilité pub — uniquement quand le webhook Meta les
      // fournit (exige meta_leads_webhook.sql exécuté au préalable)
      ...(payload.metaAdId !== undefined || payload.metaFormId !== undefined
        ? {
            meta_ad_id: payload.metaAdId?.trim().slice(0, 100) || null,
            meta_form_id: payload.metaFormId?.trim().slice(0, 100) || null,
          }
        : {}),
    })
    .select("id")
    .single();

  if (eLead) {
    // Unique violation sur meta_lead_id : Make a renvoyé le même lead en parallèle
    if (eLead.code === "23505" && metaLeadId) {
      const { data: deja } = await admin
        .from("leads").select("id, contact_id").eq("meta_lead_id", metaLeadId).maybeSingle();
      if (deja) return { leadId: deja.id, contactId: deja.contact_id ?? contactId, doublon: true };
    }
    console.error("[leads] insertion lead échouée :", eLead);
    throw new Error("Impossible d'enregistrer le lead.");
  }

  return { leadId: lead.id, contactId, doublon: false };
}
