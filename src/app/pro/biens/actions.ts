"use server";

import { createClient } from "@/lib/supabase/server";
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
  type: string;
  transaction: string;
  prix: number;
  ville: string;
  quartier: string | null;
  chambres: number;
  salles_bain: number;
  surface: number;
  equipements: string[] | null;
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
