"use server";

// Actions admin sur les leads qualifiés (table public.leads).
// Chaque action vérifie explicitement le rôle admin, puis écrit via le client
// service_role (même pattern que les autres actions admin). Le score reste
// généré par la base — jamais écrit ici.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, upsertContactParTelephone } from "@/lib/leads/upsert";

const STATUTS_LEAD = ["nouveau", "contacte", "qualifie", "transmis", "converti", "perdu"] as const;
export type StatutLead = (typeof STATUTS_LEAD)[number];

async function exigerAdmin(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");
  const { data: profil } = await supabase.from("profils").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") throw new Error("Accès refusé.");
}

export async function changerStatutLeadQualifie(leadId: string, statut: string): Promise<void> {
  if (!(STATUTS_LEAD as readonly string[]).includes(statut)) throw new Error("Statut invalide.");
  await exigerAdmin();

  const admin = createAdminClient();
  const { error } = await admin.from("leads").update({ statut }).eq("id", leadId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/leads");
  revalidatePath("/admin/leads/file");
}

/**
 * Affecte un conseiller au lead. Si le lead n'était pas encore engagé
 * (nouveau / contacté / qualifié), son statut passe automatiquement à
 * « transmis » — l'admin peut toujours le modifier ensuite.
 */
export async function affecterLeadConseiller(leadId: string, agentId: string | null): Promise<void> {
  await exigerAdmin();

  const admin = createAdminClient();

  if (agentId === null) {
    const { error } = await admin.from("leads").update({ agent_id: null }).eq("id", leadId);
    if (error) throw new Error(error.message);
  } else {
    // Le conseiller doit exister avec un rôle pro
    const { data: agent } = await admin
      .from("profils")
      .select("id, role")
      .eq("id", agentId)
      .maybeSingle();
    if (!agent || !["agent", "agence", "admin"].includes((agent as { role: string }).role)) {
      throw new Error("Conseiller introuvable.");
    }

    const { data: lead } = await admin
      .from("leads")
      .select("statut")
      .eq("id", leadId)
      .maybeSingle();
    const statutActuel = (lead as { statut: string } | null)?.statut;
    const avancerStatut = statutActuel && ["nouveau", "contacte", "qualifie"].includes(statutActuel);

    const { error } = await admin
      .from("leads")
      .update(avancerStatut ? { agent_id: agentId, statut: "transmis" } : { agent_id: agentId })
      .eq("id", leadId);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/leads");
  revalidatePath("/admin/leads/file");
}

/**
 * Corrige le numéro d'un lead 'a_verifier' (téléphone Meta absent/mal saisi) :
 * normalise le numéro, crée/dédoublonne le CONTACT comme pour un lead normal,
 * puis fait rejoindre le lead au circuit habituel (statut 'nouveau' → file
 * d'affectation).
 */
export async function corrigerNumeroLeadAVerifier(leadId: string, telephoneBrut: string): Promise<void> {
  await exigerAdmin();

  const telephone = normalizePhone(telephoneBrut);
  if (!telephone) throw new Error("Numéro de téléphone invalide.");

  const admin = createAdminClient();

  const { data: lead } = await admin
    .from("leads")
    .select("id, nom, email, statut")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) throw new Error("Lead introuvable.");
  if (lead.statut !== "a_verifier") throw new Error("Ce lead n'est plus en attente de vérification.");

  const contactId = await upsertContactParTelephone(admin, telephone, lead.nom, null, lead.email);

  const { error } = await admin
    .from("leads")
    .update({ telephone, contact_id: contactId, statut: "nouveau" })
    .eq("id", leadId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/leads");
  revalidatePath("/admin/leads/file");
  revalidatePath("/admin/leads/a-verifier");
}

/**
 * Ignore/supprime un lead 'a_verifier' irrécupérable (spam, numéro
 * incompréhensible). Scopé strictement à ce statut : ne peut jamais
 * supprimer un lead déjà entré dans le circuit normal.
 */
export async function ignorerLeadAVerifier(leadId: string): Promise<void> {
  await exigerAdmin();

  const admin = createAdminClient();
  const { error } = await admin
    .from("leads")
    .delete()
    .eq("id", leadId)
    .eq("statut", "a_verifier");
  if (error) throw new Error(error.message);

  revalidatePath("/admin/leads/a-verifier");
}

export async function enregistrerNotesLead(leadId: string, notes: string): Promise<void> {
  if (notes.length > 2000) throw new Error("Notes trop longues (max 2000 caractères).");
  await exigerAdmin();

  const admin = createAdminClient();
  const { error } = await admin
    .from("leads")
    .update({ notes_interne: notes.trim() || null })
    .eq("id", leadId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/leads");
  revalidatePath("/admin/leads/file");
}
