"use server";

// Création par l'AGENT d'une demande de recherche pour un client contacté
// hors-ligne — même logique que côté admin (creerInterne.ts), réservée aux
// rôles agent/agence (même garde que src/app/pro/biens/actions.ts). La
// demande créée reste soumise à la modération admin avant publication.

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { creerDemandeRechercheInterne, type DonneesDemandeRechercheInterne } from "@/lib/demandes/creerInterne";

async function exigerAgent(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");
  const { data: profil } = await supabase.from("profils").select("role").eq("id", user.id).single();
  if (!["agent", "agence"].includes(profil?.role ?? "")) throw new Error("Réservé aux agents.");
  return user.id;
}

export async function creerDemandeRechercheAgent(donnees: DonneesDemandeRechercheInterne): Promise<{ id: string }> {
  const agentId = await exigerAgent();
  const id = await creerDemandeRechercheInterne(donnees, agentId);
  revalidatePath("/pro/demandes-recherche");
  return { id };
}

const BUCKET_PHOTOS = "propositions-photos";

/**
 * URLs signées des photos d'une proposition — en service_role car la policy
 * storage n'autorise que is_admin() en lecture (voir demandes_recherche.sql).
 * Ownership vérifiée ici en application : seul l'agent créateur de la
 * demande concernée peut obtenir les URLs de ses propositions reçues.
 */
export async function obtenirUrlsPhotosPropositionAgent(propositionId: string): Promise<string[]> {
  const agentId = await exigerAgent();
  const admin = createAdminClient();

  const { data: proposition } = await admin
    .from("propositions_bien")
    .select("photos, demande_id")
    .eq("id", propositionId)
    .maybeSingle();
  if (!proposition?.photos?.length) return [];

  const { data: demande } = await admin
    .from("demandes_recherche")
    .select("cree_par")
    .eq("id", proposition.demande_id)
    .maybeSingle();
  if (demande?.cree_par !== agentId) throw new Error("Accès refusé.");

  const urls: string[] = [];
  for (const chemin of proposition.photos) {
    const { data } = await admin.storage.from(BUCKET_PHOTOS).createSignedUrl(chemin, 300);
    if (data?.signedUrl) urls.push(data.signedUrl);
  }
  return urls;
}
