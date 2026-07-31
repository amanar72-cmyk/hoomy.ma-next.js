// Optimisation des photos de biens — côté CLIENT, avant l'upload Supabase.
// Remplace le traitement qui était bundlé dans l'ancien filigrane, SANS aucune
// marque : cette fonction ne dessine rien.
//
// Ordre des traitements :
//   1. Orientation EXIF corrigée AVANT tout redimensionnement. Les photos de
//      téléphone portent un flag d'orientation ; createImageBitmap(..., {
//      imageOrientation: "from-image" }) lit ce flag et redresse les pixels.
//   2. Redimensionnement à 2000 px de large max, ratio conservé, jamais
//      d'agrandissement.
//   3. Ré-encodage JPEG 0.92. Le passage par canvas EFFACE toutes les
//      métadonnées EXIF, dont les coordonnées GPS — c'est le point le plus
//      important : les photos publiées ne doivent PAS révéler la position du
//      bien (le site floute les coordonnées par ailleurs).
//   4. Sortie TOUJOURS en JPEG ; le nom d'origine est conservé en .jpg.
//
// Best-effort : en cas d'échec (fichier corrompu, API indisponible), renvoie le
// fichier d'origine plutôt que de bloquer la publication.

const LARGEUR_MAX = 2000;
const QUALITE_JPEG = 0.92;

/** Nom d'origine avec l'extension remplacée par .jpg. */
function nomEnJpg(nom: string): string {
  const base = nom.replace(/\.[^./\\]+$/, "");
  return `${base || "photo"}.jpg`;
}

export async function optimiserImage(file: File): Promise<File> {
  try {
    // 1. Décodage + redressement EXIF (from-image) AVANT le redimensionnement.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

    // 2. Dimensions cibles — ratio conservé, jamais d'agrandissement.
    const largeur = Math.min(bitmap.width, LARGEUR_MAX);
    const hauteur = Math.round(bitmap.height * (largeur / bitmap.width));

    const canvas = document.createElement("canvas");
    canvas.width = largeur;
    canvas.height = hauteur;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D indisponible");
    ctx.drawImage(bitmap, 0, 0, largeur, hauteur);
    bitmap.close?.();

    // 3 + 4. Ré-encodage JPEG (efface EXIF/GPS) — sortie toujours .jpg.
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Export canvas échoué"))),
        "image/jpeg",
        QUALITE_JPEG
      );
    });

    return new File([blob], nomEnJpg(file.name), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("[HOOMY] Optimisation image échouée, upload de l'original :", err);
    return file;
  }
}
