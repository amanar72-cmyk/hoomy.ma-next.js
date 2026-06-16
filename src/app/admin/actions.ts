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

export async function changerRoleUtilisateur(id: string, role: string) {
  const supabase = await createClient();
  await supabase.from("profils").update({ role }).eq("id", id);
  revalidatePath("/admin/utilisateurs");
}
