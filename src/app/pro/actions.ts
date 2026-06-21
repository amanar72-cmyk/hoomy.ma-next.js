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
