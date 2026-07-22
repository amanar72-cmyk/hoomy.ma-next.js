import "server-only";

// Capture d'un lead qualifié à partir d'une conversation WhatsApp — SEUL
// appelant autorisé : src/app/api/whatsapp/webhook/route.ts (jamais le
// simulateur admin, qui ne doit créer AUCUNE donnée réelle).
//
// Réutilise le pipeline PARTAGÉ upsertLeadEtContact (contact dédoublonné par
// téléphone, résolution du bien, anti-doublon 24 h, score généré par la base)
// — le même que le site, Meta Ads et les demandes de rappel — puis envoie un
// email DÉDIÉ (prénom/nom/source en tête, comme demandé) plutôt que le
// gabarit générique notifierNouveauLead, à l'admin ET au conseiller du bien
// concerné s'il y en a un (même pattern que demanderRappel).

import { createAdminClient } from "@/lib/supabase/admin";
import { upsertLeadEtContact } from "@/lib/leads/upsert";
import { envoyerEmail } from "@/lib/email/envoyerEmail";
import { formaterPrix } from "@/lib/format";
import type { CriteresAgent } from "./cerveau";

export type ParamsCreationLead = {
  telephone: string; // déjà normalisé +212...
  criteres: CriteresAgent; // nom + prenom garantis non-null par l'appelant
  intention: "acheteur" | "vendeur";
  /** Valeur DB (whitelist leads.source) — toujours "whatsapp" pour ce canal. */
  source: string;
  /** Référence HM-XXXX du bien qui intéresse le plus le client, si identifiable. */
  bienInteresse: string | null;
  /** Toutes les références montrées dans la conversation (cross-sell inclus). */
  biensProposes: string[];
  /** Créneau souhaité, séparé pour la lisibilité de l'email — null si aucun. */
  visiteSouhaitee: { date: string; heure: string } | null;
  /** Résumé rédigé par l'IA (1-2 phrases, français) — null si pas encore assez d'infos. */
  resume: string | null;
};

const LIBELLES_TYPE_PROJET: Record<string, string> = {
  achat: "Achat",
  location: "Location",
  vente: "Vente (propriétaire)",
};

export async function creerLeadWhatsApp(
  params: ParamsCreationLead
): Promise<{ leadId: string | null; doublon: boolean }> {
  const { criteres } = params;
  const nomComplet = `${criteres.prenom ?? ""} ${criteres.nom ?? ""}`.trim();

  const typeProjet =
    params.intention === "vendeur" ? "vente" : criteres.transaction === "location" ? "location" : "achat";

  const budget = criteres.budget_max
    ? formaterPrix(criteres.budget_max, criteres.transaction === "location" ? "location" : "vente")
    : null;

  let resultat: Awaited<ReturnType<typeof upsertLeadEtContact>>;
  try {
    resultat = await upsertLeadEtContact({
      nom: criteres.nom ?? "(sans nom)",
      prenom: criteres.prenom,
      telephone: params.telephone,
      typeProjet,
      budget,
      zones: criteres.ville ? [criteres.ville] : null,
      message: params.resume ?? "Lead qualifié via l'assistant WhatsApp Linda.",
      source: params.source,
      bienRef: params.bienInteresse,
    });
  } catch (e) {
    console.error("[lead whatsapp] création échouée :", e);
    return { leadId: null, doublon: false };
  }

  // Doublon récent (même téléphone déjà traité < 24 h) : ne pas re-notifier.
  if (resultat.doublon) return { leadId: resultat.leadId, doublon: true };

  // ── Conseiller du bien qui intéresse le client, s'il y en a un ────────────
  let emailConseiller: string | null = null;
  if (params.bienInteresse) {
    const admin = createAdminClient();
    const { data: bien } = await admin
      .from("biens")
      .select("agent_id")
      .ilike("reference", params.bienInteresse)
      .maybeSingle();
    if (bien?.agent_id) {
      const { data: profil } = await admin
        .from("profils")
        .select("email")
        .eq("id", bien.agent_id)
        .maybeSingle();
      emailConseiller = profil?.email ?? null;
    }
  }

  // ── Email dédié — prénom/nom/source en tête, comme demandé ────────────────
  const lignes = [
    "Nouveau lead qualifié par Linda (assistant WhatsApp HOOMY).",
    "",
    `Prénom : ${criteres.prenom ?? "—"}`,
    `Nom : ${criteres.nom ?? "—"}`,
    `Source : ${criteres.source_declaree ?? "WhatsApp (source non précisée par le client)"}`,
    "",
    `Intention : ${LIBELLES_TYPE_PROJET[typeProjet] ?? typeProjet}`,
    criteres.ville ? `Ville : ${criteres.ville}` : null,
    criteres.type ? `Type de bien : ${criteres.type}` : null,
    budget ? `Budget : ${budget}` : null,
    "",
    params.bienInteresse ? `Bien qui l'intéresse : ${params.bienInteresse}` : null,
    params.biensProposes.length > 0 ? `Biens proposés dans la conversation : ${params.biensProposes.join(", ")}` : null,
    params.visiteSouhaitee
      ? `Visite souhaitée : ${params.visiteSouhaitee.date} à ${params.visiteSouhaitee.heure} (à confirmer avec le client)`
      : null,
    "",
    params.resume ? `Résumé : ${params.resume}` : null,
    "",
    `Téléphone : ${params.telephone}`,
    "",
    "Retrouvez ce lead dans le back-office : https://hoomy.ma/admin/leads",
  ].filter((l): l is string => l !== null);

  const sujet = `📲 Nouveau lead WhatsApp — ${nomComplet || "sans nom"}${criteres.ville ? ` (${criteres.ville})` : ""}`;

  const taches: Promise<void>[] = [envoyerEmail({ sujet, texte: lignes.join("\n") })];
  if (emailConseiller) {
    taches.push(envoyerEmail({ sujet, texte: lignes.join("\n"), destinataire: emailConseiller }));
  }

  for (const r of await Promise.allSettled(taches)) {
    if (r.status === "rejected") console.error("[lead whatsapp] notification échouée :", r.reason);
  }

  return { leadId: resultat.leadId, doublon: false };
}
