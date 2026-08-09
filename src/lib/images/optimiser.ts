// Optimisation des photos de biens — côté CLIENT, avant l'upload Supabase.
// Remplace le traitement qui était bundlé dans l'ancien filigrane, SANS aucune
// marque ni superposition de texte : cette fonction ne dessine rien (Meta
// refuse les images de catalogue qui portent un filigrane).
//
// Ordre des traitements :
//   1. Orientation EXIF corrigée AVANT tout redimensionnement. Les photos de
//      téléphone portent un flag d'orientation ; createImageBitmap(..., {
//      imageOrientation: "from-image" }) lit ce flag et redresse les pixels.
//   2. Redimensionnement : le PLUS LONG CÔTÉ à 2000 px max, ratio conservé,
//      jamais d'agrandissement (une photo portrait est aussi plafonnée).
//   3. Ré-encodage JPEG 0.92. Le passage par canvas EFFACE toutes les
//      métadonnées EXIF, dont les coordonnées GPS — c'est le point le plus
//      important : les photos publiées ne doivent PAS révéler la position du
//      bien (le site floute les coordonnées par ailleurs).
//   4. Garantie < 8 Mo : si le JPEG dépasse, on baisse la qualité par paliers.
//   5. Sortie TOUJOURS en JPEG ; le nom d'origine est conservé en .jpg.
//
// Best-effort : en cas d'échec (fichier corrompu, API indisponible), renvoie le
// fichier d'origine plutôt que de bloquer la publication.

const COTE_MAX = 2000;          // plus long côté, en px
const QUALITE_INIT = 0.92;
const QUALITE_MIN = 0.5;        // plancher : en-dessous, on garde le dernier rendu
const PAS_QUALITE = 0.08;
const TAILLE_MAX_OCTETS = 8 * 1024 * 1024; // 8 Mo

/** Nom d'origine avec l'extension remplacée par .jpg. */
function nomEnJpg(nom: string): string {
  const base = nom.replace(/\.[^./\\]+$/, "");
  return `${base || "photo"}.jpg`;
}

/** Encode le canvas en JPEG à la qualité donnée. */
function encoderJpeg(canvas: HTMLCanvasElement, qualite: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Export canvas échoué"))),
      "image/jpeg",
      qualite
    );
  });
}

export async function optimiserImage(file: File): Promise<File> {
  try {
    // 1. Décodage + redressement EXIF (from-image) AVANT le redimensionnement.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

    // 2. Dimensions cibles — plafonne le PLUS LONG côté, ratio conservé,
    //    jamais d'agrandissement (échelle ≤ 1).
    const coteMax = Math.max(bitmap.width, bitmap.height);
    const echelle = Math.min(1, COTE_MAX / coteMax);
    const largeur = Math.max(1, Math.round(bitmap.width * echelle));
    const hauteur = Math.max(1, Math.round(bitmap.height * echelle));

    const canvas = document.createElement("canvas");
    canvas.width = largeur;
    canvas.height = hauteur;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D indisponible");
    ctx.drawImage(bitmap, 0, 0, largeur, hauteur);
    bitmap.close?.();

    // 3 + 4. Ré-encodage JPEG (efface EXIF/GPS), puis descente de qualité par
    //    paliers jusqu'à passer sous 8 Mo (rare après redimensionnement à 2000 px).
    let qualite = QUALITE_INIT;
    let blob = await encoderJpeg(canvas, qualite);
    while (blob.size > TAILLE_MAX_OCTETS && qualite > QUALITE_MIN) {
      qualite = Math.max(QUALITE_MIN, qualite - PAS_QUALITE);
      blob = await encoderJpeg(canvas, qualite);
    }

    // 5. Sortie toujours .jpg.
    return new File([blob], nomEnJpg(file.name), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("[HOOMY] Optimisation image échouée, upload de l'original :", err);
    return file;
  }
}
