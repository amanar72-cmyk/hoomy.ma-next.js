"use server";

// Actions admin sur la file de publications sociales.
// Rôle vérifié côté application, écriture via service_role — même schéma que
// les autres actions admin (voir admin/leads/actions.ts).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function exigerAdmin(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");
  const { data: profil } = await supabase.from("profils").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") throw new Error("Accès refusé.");
}

/** Annule une publication encore en attente. */
export async function annulerPublication(id: string): Promise<void> {
  await exigerAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("publications_sociales")
    .update({ statut: "annule" })
    .eq("id", id)
    .eq("statut", "en_attente"); // ne jamais annuler ce qui est déjà parti
  if (error) throw new Error(error.message);
  revalidatePath("/admin/publications");
}

/** Remet une publication en échec dans la file, compteur de tentatives remis à zéro. */
export async function relancerPublication(id: string): Promise<void> {
  await exigerAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("publications_sociales")
    .update({
      statut: "en_attente",
      tentatives: 0,
      erreur: null,
      programme_pour: new Date().toISOString(),
    })
    .eq("id", id)
    .in("statut", ["echec", "annule"]);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/publications");
}
