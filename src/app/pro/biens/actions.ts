"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { notifierNouveauBien } from "@/lib/email/notifications";
import { dossierComplet, MESSAGE_DOCUMENTS_MANQUANTS } from "@/lib/documents/fiche";

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
  const suffixe = reference.toLowerCase().replace(/[^a-z0-9-]/g, "");
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

  // Verrou documentaire : les 3 pièces (mandat, CIN, certificat de propriété)
  // doivent être déposées AVANT l'envoi au back-office. La transition de
  // statut elle-même (RPC transmettre_au_bo) reste inchangée.
  if (!(await dossierComplet(supabase, bienId))) {
    throw new Error(MESSAGE_DOCUMENTS_MANQUANTS);
  }

  const { error } = await supabase.rpc("transmettre_au_bo", { bien_id: bienId });
  if (error) throw new Error(error.message);

  revalidatePath("/pro/biens");
}

// ── Accepter un bien depuis la file ──────────────────────────────────────────

export async function accepterBien(bienId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  const { data, error } = await supabase.rpc("accepter_bien", { bien_id: bienId });
  if (error) throw new Error(error.message);
  if (data && typeof data === "object" && "success" in data && !data.success) {
    throw new Error((data as { message?: string }).message ?? "Ce bien n'est plus disponible.");
  }

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
  composition: import("@/components/partage/CompositionNiveaux").NiveauBien[] | null;
  latitude: number | null;
  longitude: number | null;
  // Fiche du répertoire proprietaires (vendeur) — obligatoire à la création
  vendeurId: string;
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

  // Propriétaire obligatoire : la fiche doit exister dans le répertoire
  // (vendeurId ne part JAMAIS tel quel dans l'insert — colonne vendeur_id).
  const { vendeurId, ...champsBien } = donnees;
  if (!vendeurId) throw new Error("Veuillez rattacher le bien à un propriétaire.");
  const { data: vendeur } = await supabase
    .from("proprietaires")
    .select("id")
    .eq("id", vendeurId)
    .maybeSingle();
  if (!vendeur) throw new Error("Propriétaire introuvable dans le répertoire.");

  const reference = genererReference();
  const slug = genererSlug(donnees.titre, donnees.ville, reference);

  const { data: bien, error } = await supabase
    .from("biens")
    .insert({
      ...champsBien,
      reference,
      slug,
      agent_id: user.id,
      vendeur_id: vendeurId,
      statut: "brouillon",
      verifie: false,
    })
    .select("id")
    .single();

  if (error || !bien) throw new Error(error?.message ?? "Erreur lors de la création.");

  revalidatePath("/pro/biens");

  // Notification email best-effort — ne doit jamais faire échouer la création.
  await notifierNouveauBien({
    titre: donnees.titre,
    ville: donnees.ville,
    prix: donnees.prix,
    transaction: donnees.transaction,
    reference,
    auteur: `${user.email ?? "Agent HOOMY.MA"} (agent)`,
  });

  return { id: bien.id };
}

// ── Modifier un bien (brouillon ou affecte) ───────────────────────────────────

export type DonneesModificationBienAgent = {
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
  composition: import("@/components/partage/CompositionNiveaux").NiveauBien[] | null;
  photos: string[] | null;
  photosOriginales: string[] | null;
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
  const { photosOriginales, ...reste } = donnees;
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("biens")
    .update({ ...reste, photos_originales: photosOriginales })
    .eq("id", bienId);

  if (error) throw new Error(error.message);

  revalidatePath("/pro/biens");
  revalidatePath(`/pro/biens/${bienId}`);
}
