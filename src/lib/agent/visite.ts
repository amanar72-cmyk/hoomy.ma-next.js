import "server-only";

// Création d'une demande de visite à partir d'une conversation WhatsApp —
// SEUL appelant autorisé : src/app/api/whatsapp/webhook/route.ts (jamais le
// simulateur admin, qui ne doit créer AUCUNE donnée réelle).
//
// Réutilise exactement le pattern de src/app/detail/actions.ts (demandeRappel/
// soumettreDemandeVisite) : ligne dans `demandes_visite`, statut 'nouvelle',
// date_souhaitee (jamais date_confirmee — l'IA ne garantit aucun créneau,
// seul un conseiller humain confirme), notification push + email.

import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerNotificationAuxAdmins, envoyerNotificationPush, type PayloadPush } from "@/lib/push/notifications";
import { notifierNouvelleActiviteLead } from "@/lib/email/notifications";
import type { VisiteEvoquee } from "./cerveau";

export type ParamsCreationVisite = {
  telephone: string; // déjà normalisé +212...
  nomClient: string | null;
  visite: VisiteEvoquee; // confirmee garanti true par l'appelant
};

export async function creerDemandeVisiteWhatsApp(
  params: ParamsCreationVisite
): Promise<{ creee: boolean }> {
  const admin = createAdminClient();

  // Résolution du bien — facultative : une visite sans bien identifié reste
  // utile (un conseiller peut recontacter le client pour clarifier).
  let bienId: string | null = null;
  let agentId: string | null = null;
  let titreBien = "bien discuté via WhatsApp";
  if (params.visite.bien_ref) {
    const { data: bien } = await admin
      .from("biens")
      .select("id, titre, agent_id")
      .ilike("reference", params.visite.bien_ref)
      .maybeSingle();
    if (bien) {
      bienId = bien.id;
      agentId = bien.agent_id;
      titreBien = bien.titre;
    }
  }

  const nom = params.nomClient?.trim() || "Client WhatsApp";
  const dateSouhaitee = params.visite.date_iso; // déjà validé (futur, ISO) par cerveau.ts

  const { error } = await admin.from("demandes_visite").insert({
    bien_id: bienId,
    agent_id: agentId,
    telephone_client: params.telephone,
    nom_client: nom,
    email_client: null,
    date_souhaitee: dateSouhaitee,
    message:
      `Rendez-vous convenu via l'assistant WhatsApp : « ${params.visite.texte_brut ?? "(non précisé)"} »` +
      (dateSouhaitee ? "" : " — date non résolue automatiquement, à confirmer avec le client."),
    statut: "nouvelle",
  });

  if (error) {
    console.error("[visite whatsapp] création demandes_visite échouée :", error);
    return { creee: false };
  }

  // Notifications — best-effort, jamais bloquantes pour la conversation.
  const payload: PayloadPush = {
    titre: "📅 Visite convenue via WhatsApp",
    corps: `${nom} (${params.telephone}) — ${titreBien}`,
    url: "/pro/leads",
  };
  const taches: Promise<void>[] = [
    envoyerNotificationAuxAdmins(payload),
    notifierNouvelleActiviteLead({
      type: "visite",
      titreBien,
      nomClient: nom,
      emailClient: "(via WhatsApp — pas d'email)",
      telephoneClient: params.telephone,
      message: params.visite.texte_brut,
      dateSouhaitee,
    }),
  ];
  if (agentId) taches.push(envoyerNotificationPush(agentId, payload));

  for (const resultat of await Promise.allSettled(taches)) {
    if (resultat.status === "rejected") {
      console.error("[visite whatsapp] notification échouée :", resultat.reason);
    }
  }

  return { creee: true };
}
