"use server";

// Actions serveur du répertoire PROPRIÉTAIRES (vendeurs) — table
// `proprietaires`, séparée des `contacts` (acheteurs).
//
// Partagées entre /admin/proprietaires et /pro/proprietaires : la garde
// accepte admin + agent/agence, et la RLS (is_admin() / est_pro()) revérifie
// de son côté en base. Téléphone normalisé +212 (même helper que les leads)
// + unicité en base : pas de fiche en double possible.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/leads/upsert";

export type DonneesProprietaire = {
  nom: string;
  prenom: string | null;
  telephone: string;
  email: string | null;
  notes: string | null;
};

export type ResultatProprietaire =
  | { ok: true; id: string }
  // Un propriétaire avec ce téléphone existe déjà → on renvoie sa fiche
  // pour que l'UI propose d'y aller au lieu de créer un doublon.
  | { ok: false; erreur: string; existantId?: string };

function emailValide(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

/** Session + rôle admin/agent/agence requis. Renvoie le client Supabase. */
async function clientAutorise() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");
  const { data: profil } = await supabase
    .from("profils").select("role").eq("id", user.id).single();
  if (!["admin", "agent", "agence"].includes(profil?.role ?? "")) {
    throw new Error("Réservé à l'équipe HOOMY.");
  }
  return supabase;
}

/** Valide et nettoie les champs communs à la création et à la modification. */
function validerChamps(donnees: DonneesProprietaire): DonneesProprietaire | { erreur: string } {
  const nom = donnees.nom.trim();
  const prenom = donnees.prenom?.trim() || null;
  const email = donnees.email?.trim() || null;
  const notes = donnees.notes?.trim() || null;
  const telephone = normalizePhone(donnees.telephone);

  if (!nom || nom.length > 100) return { erreur: "Veuillez indiquer le nom." };
  if (prenom && prenom.length > 100) return { erreur: "Prénom trop long." };
  if (!telephone) return { erreur: "Numéro de téléphone invalide." };
  if (email && !emailValide(email)) return { erreur: "Adresse email invalide." };
  if (notes && notes.length > 2000) return { erreur: "Notes trop longues (max 2000 caractères)." };

  return { nom, prenom, telephone, email, notes };
}

function revalider() {
  revalidatePath("/admin/proprietaires");
  revalidatePath("/pro/proprietaires");
}

export async function creerProprietaire(
  donnees: DonneesProprietaire
): Promise<ResultatProprietaire> {
  const supabase = await clientAutorise();

  const champs = validerChamps(donnees);
  if ("erreur" in champs) return { ok: false, erreur: champs.erreur };

  const { data, error } = await supabase
    .from("proprietaires")
    .insert(champs)
    .select("id")
    .single();

  if (error) {
    // 23505 = violation d'unicité sur le téléphone → fiche déjà existante
    if (error.code === "23505") {
      const { data: existant } = await supabase
        .from("proprietaires")
        .select("id")
        .eq("telephone", champs.telephone)
        .maybeSingle();
      return {
        ok: false,
        erreur: "Un propriétaire avec ce numéro existe déjà.",
        existantId: existant?.id,
      };
    }
    return { ok: false, erreur: `Enregistrement impossible : ${error.message}` };
  }

  revalider();
  return { ok: true, id: data.id };
}

export async function modifierProprietaire(
  id: string,
  donnees: DonneesProprietaire
): Promise<ResultatProprietaire> {
  const supabase = await clientAutorise();

  const champs = validerChamps(donnees);
  if ("erreur" in champs) return { ok: false, erreur: champs.erreur };

  const { error } = await supabase
    .from("proprietaires")
    .update(champs)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      const { data: existant } = await supabase
        .from("proprietaires")
        .select("id")
        .eq("telephone", champs.telephone)
        .maybeSingle();
      return {
        ok: false,
        erreur: "Un autre propriétaire a déjà ce numéro.",
        existantId: existant?.id,
      };
    }
    return { ok: false, erreur: `Modification impossible : ${error.message}` };
  }

  revalider();
  revalidatePath(`/admin/proprietaires/${id}`);
  revalidatePath(`/pro/proprietaires/${id}`);
  return { ok: true, id };
}
