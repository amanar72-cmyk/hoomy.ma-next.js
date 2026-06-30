"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  envoyerNotificationPush,
  envoyerNotificationAuxAdmins,
  type PayloadPush,
} from "@/lib/push/notifications";
import { notifierNouvelleActiviteLead } from "@/lib/email/notifications";

export type DonneesDemandeVisite = {
  bienId: string;
  agentId: string | null;
  titreBien: string;
  nomClient: string;
  emailClient: string;
  telephoneClient: string | null;
  dateSouhaitee: string;
  message: string | null;
};

export async function soumettreDemandeVisite(donnees: DonneesDemandeVisite) {
  // Récupérer l'utilisateur connecté s'il existe (visiteur peut être anonyme)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { error } = await admin.from("demandes_visite").insert({
    bien_id: donnees.bienId,
    agent_id: donnees.agentId,
    client_id: user?.id ?? null,
    nom_client: donnees.nomClient,
    email_client: donnees.emailClient,
    telephone_client: donnees.telephoneClient,
    date_souhaitee: donnees.dateSouhaitee,
    message: donnees.message,
    statut: "nouvelle",
  });
  if (error) throw new Error(error.message);

  // Notifications push best-effort
  const payload: PayloadPush = {
    titre: "Nouvelle demande de visite",
    corps: `${donnees.nomClient} — ${donnees.titreBien}`,
    url: "/pro/leads",
  };
  const taches: Promise<void>[] = [
    envoyerNotificationAuxAdmins(payload),
    notifierNouvelleActiviteLead({
      type: "visite",
      titreBien: donnees.titreBien,
      nomClient: donnees.nomClient,
      emailClient: donnees.emailClient,
      telephoneClient: donnees.telephoneClient,
      message: donnees.message,
      dateSouhaitee: donnees.dateSouhaitee,
    }),
  ];
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
};

export async function soumettreMessage(donnees: DonneesMessage) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { error } = await admin.from("demandes_visite").insert({
    bien_id: donnees.bienId,
    agent_id: donnees.agentId,
    client_id: user?.id ?? null,
    nom_client: donnees.nomClient,
    email_client: donnees.emailClient,
    telephone_client: donnees.telephoneClient,
    date_souhaitee: null,
    message: donnees.message,
    statut: "nouvelle",
  });
  if (error) throw new Error(error.message);

  const payload: PayloadPush = {
    titre: "Nouveau message client",
    corps: `${donnees.nomClient} — ${donnees.titreBien}`,
    url: "/pro/leads",
  };
  const taches: Promise<void>[] = [
    envoyerNotificationAuxAdmins(payload),
    notifierNouvelleActiviteLead({
      type: "message",
      titreBien: donnees.titreBien,
      nomClient: donnees.nomClient,
      emailClient: donnees.emailClient,
      telephoneClient: donnees.telephoneClient,
      message: donnees.message,
      dateSouhaitee: null,
    }),
  ];
  if (donnees.agentId) taches.push(envoyerNotificationPush(donnees.agentId, payload));
  for (const resultat of await Promise.allSettled(taches)) {
    if (resultat.status === "rejected") console.error("[notifications] soumettreMessage :", resultat.reason);
  }
}
