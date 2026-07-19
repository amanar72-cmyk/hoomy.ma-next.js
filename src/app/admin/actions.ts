"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { envoyerNotificationPush } from "@/lib/push/notifications";
import { promouvoirPhotosNettes } from "@/lib/images/promouvoirPhotos";

// ── Biens ────────────────────────────────────────────────────────────────────

export async function verifierBien(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const { data: profil } = await supabase.from("profils").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") throw new Error("Accès refusé — réservé aux admins");

  const { data: bien } = await supabase
    .from("biens")
    .select("verifie, photos_originales")
    .eq("id", id)
    .single();

  const updates: { verifie: boolean; photos?: string[] } = { verifie: true };

  // Bien encore non validé avec des photos en attente côté privé : on les promeut
  // en version nette publique (le flou n'a plus lieu d'être une fois validé).
  if (bien && !bien.verifie) {
    const photosOriginales = (bien.photos_originales as string[] | null) ?? [];
    if (photosOriginales.length > 0) {
      const urlsNettes = await promouvoirPhotosNettes(photosOriginales);
      const reussies = urlsNettes.filter((u): u is string => Boolean(u));
      if (reussies.length > 0) updates.photos = reussies;
    }
  }

  await supabase.from("biens").update(updates).eq("id", id);
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
  photosOriginales: string[] | null;
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

  const { data: bienActuel } = await supabase.from("biens").select("verifie").eq("id", bienId).single();

  const { photosOriginales, ...reste } = donnees;
  const updates: Record<string, unknown> = { ...reste, photos_originales: photosOriginales };

  // Passage non-validé → validé dans la même soumission : promouvoir les photos privées en public.
  // Zip par index avec donnees.photos pour ne remplacer QUE les entrées ayant un original privé
  // (les URLs collées manuellement, sans original, restent inchangées).
  if (donnees.verifie && bienActuel && !bienActuel.verifie) {
    const photosActuelles = donnees.photos ?? [];
    const originaux = photosOriginales ?? [];
    const indices: number[] = [];
    const chemins: string[] = [];
    originaux.forEach((chemin, i) => {
      if (chemin) { indices.push(i); chemins.push(chemin); }
    });
    if (chemins.length > 0) {
      const urlsNettes = await promouvoirPhotosNettes(chemins);
      const photosFinales = [...photosActuelles];
      indices.forEach((idx, j) => {
        if (urlsNettes[j]) photosFinales[idx] = urlsNettes[j] as string;
      });
      updates.photos = photosFinales;
    }
  }

  const { error } = await supabase.from("biens").update(updates).eq("id", bienId);
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
  const suffixe = reference.toLowerCase().replace(/[^a-z0-9-]/g, "");
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
  // Fiche du répertoire proprietaires (vendeur) — obligatoire à la création
  vendeurId: string;
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
      verifie: false,
      statut: mettreEnFile ? "en_attente_affectation" : "brouillon",
      proprietaire_id: user.id,
      vendeur_id: vendeurId,
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

  if (agentId) {
    // Affectation manuelle : sort toujours le bien de la file ouverte
    // (sinon il reste visible dans /pro/file alors qu'il a déjà un agent).
    updates.dans_file = false;
    if (["brouillon", "affecte", "dans_la_file", "en_attente_affectation"].includes(statutActuel ?? "")) {
      updates.statut = "affecte";
    }
  } else if (["brouillon", "affecte"].includes(statutActuel ?? "")) {
    updates.statut = "brouillon";
  }

  const { error } = await supabase.from("biens").update(updates).eq("id", bienId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/biens");
  revalidatePath(`/admin/biens/${bienId}`);
  revalidatePath("/admin/affectation");
  revalidatePath("/admin/agents");

  if (agentId) {
    const { data: bien } = await supabase
      .from("biens")
      .select("titre")
      .eq("id", bienId)
      .single();
    await envoyerNotificationPush(agentId, {
      titre: "Nouveau bien affecté",
      corps: bien?.titre ?? "Un bien vous a été affecté.",
      url: `/pro/biens/${bienId}`,
    }).catch((err) => console.error("[push] affecterBienAgent :", err instanceof Error ? err.message : err));
  }
}

// ── Statut leads (admin) ──────────────────────────────────────────────────────

const STATUTS_VALIDES_LEAD_ADMIN = ["nouvelle", "confirmee", "realisee", "annulee"] as const;

export async function changerStatutLeadAdmin(leadId: string, statut: string) {
  if (!(STATUTS_VALIDES_LEAD_ADMIN as readonly string[]).includes(statut)) throw new Error("Statut invalide.");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");
  const { data: profil } = await supabase.from("profils").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") throw new Error("Accès refusé.");

  const { error } = await supabase
    .from("demandes_visite")
    .update({ statut })
    .eq("id", leadId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/demandes");
  revalidatePath("/admin");
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

// ── Documents du dossier (table documents_fiche) ─────────────────────────────

/**
 * Passe un document du dossier en statut 'verifie'. Réservé à l'admin :
 * garde applicative explicite + update via le client SSR authentifié → la
 * policy RLS is_admin() s'applique aussi (double sécurité). Seul le statut
 * change — signe_le et le reste de la ligne sont intacts.
 */
export async function marquerDocumentVerifie(documentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const { data: profil } = await supabase.from("profils").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") throw new Error("Accès refusé — réservé aux admins");

  const { error } = await supabase
    .from("documents_fiche")
    .update({ statut: "verifie" })
    .eq("id", documentId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/verifications");
}
