"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ── Biens ────────────────────────────────────────────────────────────────────

export async function verifierBien(id: string) {
  const supabase = await createClient();
  await supabase.from("biens").update({ verifie: true }).eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/admin/biens");
  revalidatePath("/admin/verifications");
}

export async function deverifierBien(id: string) {
  const supabase = await createClient();
  await supabase.from("biens").update({ verifie: false }).eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/admin/biens");
}

export async function supprimerBien(id: string) {
  const supabase = await createClient();
  await supabase.from("biens").delete().eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/admin/biens");
  revalidatePath("/admin/verifications");
}

// ── Utilisateurs ─────────────────────────────────────────────────────────────


// ── Édition de bien ──────────────────────────────────────────────────────────

type DonneesBien = {
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
  photos: string[] | null;
  verifie: boolean;
  statut: string | null;
  latitude: number | null;
  longitude: number | null;
};

export async function modifierBien(bienId: string, donnees: DonneesBien) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const { data: profil } = await supabase.from("profils").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") throw new Error("Accès refusé — réservé aux admins");

  const { error } = await supabase.from("biens").update(donnees).eq("id", bienId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/admin/biens");
  revalidatePath(`/admin/biens/${bienId}`);
  revalidatePath("/admin/affectation");
  revalidatePath("/admin/verifications");
}

// ── Affectation ───────────────────────────────────────────────────────────────

export async function mettreDansFile(bienId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mettre_dans_file", { bien_id: bienId });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/affectation");
}

export async function retirerBienAgent(bienId: string, remettreEnFile: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("retirer_bien_agent", {
    bien_id: bienId,
    remettre_en_file: remettreEnFile,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/affectation");
  revalidatePath("/admin/agents");
}

// Retire un bien de la file d'attente (dans_la_file → en_attente_affectation)
export async function retirerDeFile(bienId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");
  const { data: profil } = await supabase.from("profils").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") throw new Error("Accès refusé.");
  const { error } = await supabase.from("biens")
    .update({ statut: "en_attente_affectation", dans_file: false })
    .eq("id", bienId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/affectation");
}

// Affectation directe à un agent choisi manuellement
export async function affecterAManuel(bienId: string, agentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");
  const { data: profil } = await supabase.from("profils").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") throw new Error("Accès refusé.");
  const { error } = await supabase.from("biens")
    .update({
      agent_id: agentId,
      statut: "affecte",
      dans_file: false,
      date_affectation: new Date().toISOString(),
    })
    .eq("id", bienId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/affectation");
  revalidatePath("/admin/agents");
}

// ── Création de bien ─────────────────────────────────────────────────────────

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
  // Format HM-XXXXX : préfixe + 5 chiffres aléatoires
  const num = Math.floor(10000 + Math.random() * 90000);
  return `HM-${num}`;
}

function genererSlug(titre: string, ville: string, reference: string): string {
  const base = `${normaliserPourSlug(titre)}-${normaliserPourSlug(ville)}`;
  const suffixe = reference.toLowerCase().replace("-", "");
  return `${base}-${suffixe}`;
}

type NouveauBien = {
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
  latitude: number | null;
  longitude: number | null;
  equipements: string[] | null;
  photos: string[] | null;
};

export async function creerBien(
  donnees: NouveauBien,
  mettreEnFile: boolean
): Promise<{ id: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const { data: profil } = await supabase.from("profils").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") throw new Error("Accès refusé — réservé aux admins");

  const reference = genererReference();
  const slug = genererSlug(donnees.titre, donnees.ville, reference);

  const { data: bien, error } = await supabase
    .from("biens")
    .insert({
      ...donnees,
      reference,
      slug,
      verifie: false,
      statut: mettreEnFile ? "en_attente_affectation" : "brouillon",
      proprietaire_id: user.id,
    })
    .select("id")
    .single();

  if (error || !bien) throw new Error(error?.message ?? "Erreur lors de la création");

  if (mettreEnFile) {
    const { error: rpcError } = await supabase.rpc("mettre_dans_file", { bien_id: bien.id });
    if (rpcError) throw new Error(rpcError.message);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/biens");
  revalidatePath("/admin/affectation");

  return { id: bien.id };
}

// Affectation depuis la fiche bien (formulaire select + submit)
export async function affecterBienAgent(bienId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");
  const { data: profil } = await supabase.from("profils").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") throw new Error("Accès refusé.");

  const agentId = (formData.get("agent_id") as string | null)?.trim() || null;

  // Lire le statut actuel pour décider si on le met à jour
  const { data: bien } = await supabase.from("biens").select("statut").eq("id", bienId).single();
  const statutActuel = bien?.statut as string | null;

  const updates: Record<string, unknown> = {
    agent_id: agentId,
    date_affectation: agentId ? new Date().toISOString() : null,
  };

  if (["brouillon", "affecte"].includes(statutActuel ?? "")) {
    updates.statut = agentId ? "affecte" : "brouillon";
  }

  const { error } = await supabase.from("biens").update(updates).eq("id", bienId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/biens");
  revalidatePath(`/admin/biens/${bienId}`);
  revalidatePath("/admin/affectation");
  revalidatePath("/admin/agents");
}

// ── Agents ────────────────────────────────────────────────────────────────────

export async function modifierZonesAgent(agentId: string, zones: string[]) {
  const supabase = await createClient();
  await supabase.from("profils").update({ zones }).eq("id", agentId);
  revalidatePath("/admin/agents");
}

export async function changerRole(userId: string, nouveauRole: string) {
  const supabase = await createClient();

  // Vérification que l'appelant est bien admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");
  const { data: profilAdmin } = await supabase
    .from("profils").select("role").eq("id", user.id).single();
  if (profilAdmin?.role !== "admin")
    throw new Error("Accès refusé — réservé aux administrateurs.");

  // Interdire la promotion en admin via l'interface (réservé au SQL)
  if (nouveauRole === "admin")
    throw new Error("La promotion au rang d'administrateur est interdite via l'interface.");

  // Interdire de toucher à un compte admin existant
  const { data: cible } = await supabase
    .from("profils").select("role").eq("id", userId).single();
  if (!cible) throw new Error("Utilisateur introuvable.");
  if (cible.role === "admin")
    throw new Error("Impossible de modifier le rôle d'un administrateur.");

  const { error } = await supabase
    .from("profils").update({ role: nouveauRole }).eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/agents");
  revalidatePath("/admin/clients");
  revalidatePath("/admin/utilisateurs");
}
