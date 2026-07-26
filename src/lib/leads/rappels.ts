"use server";

// Rappels programmés sur un lead — logique PARTAGÉE admin + agent.
// Nécessite rappels_leads.sql (colonnes date_rappel / rappel_note /
// rappel_fait_le).
//
// Autorisation en deux temps, comme le reste des actions leads :
//   1. rôle vérifié côté application ;
//   2. écriture via service_role (la RLS de `leads` n'ouvre rien aux agents).
// Un ADMIN agit sur n'importe quel lead ; un AGENT uniquement sur les siens
// (agent_id), vérifié en base et jamais depuis un paramètre client.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const LONGUEUR_NOTE_MAX = 500;

/**
 * Vérifie que l'appelant a le droit d'agir sur CE lead.
 * Renvoie le client service_role une fois l'autorisation acquise.
 */
async function autoriserSurLead(leadId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  const { data: profil } = await supabase
    .from("profils").select("role").eq("id", user.id).single();
  const role = profil?.role ?? "";
  if (!["admin", "agent", "agence"].includes(role)) throw new Error("Accès refusé.");

  const admin = createAdminClient();

  // L'admin passe partout ; l'agent doit être l'affectataire du lead.
  if (role !== "admin") {
    const { data: lead } = await admin
      .from("leads").select("agent_id").eq("id", leadId).maybeSingle();
    if (!lead || lead.agent_id !== user.id) throw new Error("Accès refusé.");
  }

  return admin;
}

function revalider() {
  revalidatePath("/admin/leads");
  revalidatePath("/admin/calendrier");
  revalidatePath("/pro/leads");
  revalidatePath("/pro/calendrier");
}

/**
 * Programme (ou reprogramme) le rappel d'un lead.
 * @param dateRappel ISO 8601 complet — date ET heure.
 */
export async function programmerRappel(
  leadId: string,
  dateRappel: string,
  note?: string | null
): Promise<void> {
  const admin = await autoriserSurLead(leadId);

  const d = new Date(dateRappel);
  if (Number.isNaN(d.getTime())) throw new Error("Date de rappel invalide.");
  // Un rappel dans le passé n'a pas de sens et fausserait la liste des retards.
  if (d.getTime() < Date.now() - 60_000) {
    throw new Error("Le rappel doit être programmé dans le futur.");
  }

  const { error } = await admin
    .from("leads")
    .update({
      date_rappel: d.toISOString(),
      rappel_note: note?.trim().slice(0, LONGUEUR_NOTE_MAX) || null,
      // Reprogrammer réactive le rappel : on efface un éventuel « fait ».
      rappel_fait_le: null,
    })
    .eq("id", leadId);
  if (error) throw new Error(error.message);

  revalider();
}

/** Marque le rappel comme effectué (garde la date pour l'historique). */
export async function marquerRappelFait(leadId: string): Promise<void> {
  const admin = await autoriserSurLead(leadId);
  const { error } = await admin
    .from("leads")
    .update({ rappel_fait_le: new Date().toISOString() })
    .eq("id", leadId);
  if (error) throw new Error(error.message);
  revalider();
}

/** Supprime complètement le rappel (le client ne souhaite plus être rappelé). */
export async function annulerRappel(leadId: string): Promise<void> {
  const admin = await autoriserSurLead(leadId);
  const { error } = await admin
    .from("leads")
    .update({ date_rappel: null, rappel_note: null, rappel_fait_le: null })
    .eq("id", leadId);
  if (error) throw new Error(error.message);
  revalider();
}
