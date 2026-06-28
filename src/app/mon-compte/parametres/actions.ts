"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function mettreAJourProfil(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const nomComplet = (formData.get("nom_complet") as string | null)?.trim() || null;
  const telephone  = (formData.get("telephone")   as string | null)?.trim() || null;

  const { error } = await supabase
    .from("profils")
    .update({ nom_complet: nomComplet, telephone })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/mon-compte/parametres");
  revalidatePath("/mon-compte");
}
