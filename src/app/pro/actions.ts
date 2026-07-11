"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ── Confirmer une visite ──────────────────────────────────────────────────────

export async function confirmerVisite(demandeId: string, dateConfirmee: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  const { data: demande } = await supabase
    .from("demandes_visite")
    .select("agent_id")
    .eq("id", demandeId)
    .single();
  if (!demande || demande.agent_id !== user.id) throw new Error("Accès refusé.");

  const { error } = await supabase
    .from("demandes_visite")
    .update({ statut: "confirmee", date_confirmee: dateConfirmee })
    .eq("id", demandeId);
  if (error) throw new Error(error.message);

  revalidatePath("/pro/demandes");
  revalidatePath("/pro/calendrier");
}

// ── Marquer comme réalisée ────────────────────────────────────────────────────

export async function marquerRealisee(demandeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  const { data: demande } = await supabase
    .from("demandes_visite")
    .select("agent_id")
    .eq("id", demandeId)
    .single();
  if (!demande || demande.agent_id !== user.id) throw new Error("Accès refusé.");

  const { error } = await supabase
    .from("demandes_visite")
    .update({ statut: "realisee" })
    .eq("id", demandeId);
  if (error) throw new Error(error.message);

  revalidatePath("/pro/demandes");
  revalidatePath("/pro/calendrier");
}

// ── Annuler une visite ────────────────────────────────────────────────────────

export async function annulerVisite(demandeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  const { data: demande } = await supabase
    .from("demandes_visite")
    .select("agent_id")
    .eq("id", demandeId)
    .single();
  if (!demande || demande.agent_id !== user.id) throw new Error("Accès refusé.");

  const { error } = await supabase
    .from("demandes_visite")
    .update({ statut: "annulee" })
    .eq("id", demandeId);
  if (error) throw new Error(error.message);

  revalidatePath("/pro/demandes");
  revalidatePath("/pro/calendrier");
}

// ── Changer le statut d'un lead (vue Leads) ───────────────────────────────────

const STATUTS_VALIDES_LEAD = ["nouvelle", "confirmee", "realisee", "annulee"] as const;

export async function changerStatutLead(leadId: string, statut: string) {
  if (!(STATUTS_VALIDES_LEAD as readonly string[]).includes(statut)) throw new Error("Statut invalide.");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  const { data: lead } = await supabase
    .from("demandes_visite")
    .select("agent_id")
    .eq("id", leadId)
    .single();
  if (!lead || lead.agent_id !== user.id) throw new Error("Accès refusé.");

  const { error } = await supabase
    .from("demandes_visite")
    .update({ statut })
    .eq("id", leadId);
  if (error) throw new Error(error.message);

  revalidatePath("/pro/leads");
  revalidatePath("/pro/demandes");
}

// ── Leads qualifiés affectés (table public.leads) ─────────────────────────────
// L'agent met à jour le statut de SES leads uniquement : vérification de
// propriété (agent_id) puis écriture via service_role — la RLS de la table
// leads ne donne pas d'accès direct aux agents.

const STATUTS_LEAD_QUALIFIE_AGENT = ["transmis", "contacte", "qualifie", "converti", "perdu"] as const;

export async function changerStatutLeadQualifieAgent(leadId: string, statut: string) {
  if (!(STATUTS_LEAD_QUALIFIE_AGENT as readonly string[]).includes(statut)) {
    throw new Error("Statut invalide.");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data: lead } = await admin
    .from("leads")
    .select("agent_id")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead || lead.agent_id !== user.id) throw new Error("Accès refusé.");

  const { error } = await admin.from("leads").update({ statut }).eq("id", leadId);
  if (error) throw new Error(error.message);

  revalidatePath("/pro/leads");
  revalidatePath("/admin/leads");
  revalidatePath("/admin/leads/file");
}
