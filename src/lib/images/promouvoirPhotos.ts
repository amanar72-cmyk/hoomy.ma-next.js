import { createAdminClient } from "@/lib/supabase/admin";

// Appelé UNIQUEMENT au moment où un bien passe à verifie=true (déjà protégé par
// un contrôle de rôle admin dans l'appelant). Copie les photos nettes du bucket
// privé "biens-prive" vers le bucket public "biens" (même chemin, écrase la
// version floutée qui s'y trouvait) et retourne les nouvelles URLs publiques.
// Le tableau retourné a EXACTEMENT la même longueur/ordre que `photosOriginales`
// (null pour une entrée dont la promotion a échoué) pour permettre un zip par index.
export async function promouvoirPhotosNettes(photosOriginales: string[]): Promise<(string | null)[]> {
  if (photosOriginales.length === 0) return [];
  const adminClient = createAdminClient();

  return Promise.all(
    photosOriginales.map(async (chemin): Promise<string | null> => {
      const { data: fichier, error: erreurTelechargement } = await adminClient.storage
        .from("biens-prive")
        .download(chemin);
      if (erreurTelechargement || !fichier) return null;

      const { error: erreurUpload } = await adminClient.storage
        .from("biens")
        .upload(chemin, fichier, { upsert: true });
      if (erreurUpload) return null;

      const { data: urlData } = adminClient.storage.from("biens").getPublicUrl(chemin);
      return urlData.publicUrl;
    })
  );
}
