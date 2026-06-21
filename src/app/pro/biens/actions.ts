"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// ── Slug / référence ──────────────────────────────────────────────────────────

function normaliserPourSlug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function genererReference(): string {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `HM-${num}`;
}

function genererSlug(titre: string, ville: string, reference: string): string {
  const base = `${normaliserPourSlug(titre)}-${normaliserPourSlug(ville)}`;
  const suffixe = reference.toLowerCase().replace("-", "");
  return `${base}-${suffixe}`;
}

// ── Transmettre au back-office ────────────────────────────────────────────────

export async function transmettreAuBo(bienId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  // S'assurer que le bien appartient bien à cet agent
  const { data: bien } = await supabase
    .from("biens")
    .select("agent_id")
    .eq("id", bienId)
    .single();
  if (!bien || bien.agent_id !== user.id) throw new Error("Accès refusé.");

  const { error } = await supabase.rpc("transmettre_au_bo", { bien_id: bienId });
  if (error) throw new Error(error.message);

  revalidatePath("/pro/biens");
}

// ── Accepter un bien depuis la file ──────────────────────────────────────────

export async function accepterBien(bienId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  const { error } = await supabase.rpc("accepter_bien", { bien_id: bienId });
  if (error) throw new Error(error.message);

  revalidatePath("/pro/file");
  revalidatePath("/pro/biens");
}

// ── Créer un bien (brouillon agent) ──────────────────────────────────────────

export type DonneesBienAgent = {
  titre: string;
  description: string | null;
  description_ar: string | null;
  type: string;
  transaction: string;
  prix: number;
  ville: string;
  quartier: string | null;
  chambres: number;
  salles_bain: number;
  surface: number;
  equipements: string[] | null;
  latitude: number | null;
  longitude: number | null;
};

export async function creerBienAgent(donnees: DonneesBienAgent): Promise<{ id: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  // Vérifier que c'est bien un agent/agence
  const { data: profil } = await supabase
    .from("profils")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!["agent", "agence"].includes(profil?.role ?? "")) throw new Error("Réservé aux agents.");

  const reference = genererReference();
  const slug = genererSlug(donnees.titre, donnees.ville, reference);

  const { data: bien, error } = await supabase
    .from("biens")
    .insert({
      ...donnees,
      reference,
      slug,
      agent_id: user.id,
      statut: "brouillon",
      verifie: false,
    })
    .select("id")
    .single();

  if (error || !bien) throw new Error(error?.message ?? "Erreur lors de la création.");

  revalidatePath("/pro/biens");
  return { id: bien.id };
}

// ── Modifier un bien (brouillon ou affecte) ───────────────────────────────────

export type DonneesModificationBienAgent = {
  titre: string;
  description: string | null;
  description_ar: string | null;
  type: string;
  transaction: string;
  prix: number;
  ville: string;
  quartier: string | null;
  chambres: number;
  salles_bain: number;
  surface: number;
  equipements: string[] | null;
  photos: string[] | null;
  latitude: number | null;
  longitude: number | null;
};

export async function modifierBienAgent(
  bienId: string,
  donnees: DonneesModificationBienAgent
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  // Vérifier propriété et statut autorisé (select passe la RLS lecture publique)
  const { data: bien } = await supabase
    .from("biens")
    .select("agent_id, statut")
    .eq("id", bienId)
    .single();

  if (!bien || bien.agent_id !== user.id) throw new Error("Accès refusé.");
  if (!["brouillon", "affecte"].includes(bien.statut ?? "")) {
    throw new Error("Ce bien ne peut plus être modifié dans son état actuel.");
  }

  // UPDATE via admin client — contourne la policy RLS UPDATE (admin-only)
  // La vérification de propriété est faite ci-dessus dans le code
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("biens")
    .update(donnees)
    .eq("id", bienId);

  if (error) throw new Error(error.message);

  revalidatePath("/pro/biens");
  revalidatePath(`/pro/biens/${bienId}`);
}
