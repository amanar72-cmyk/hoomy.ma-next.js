import "server-only";

// Normalisation des photos destinées aux posts FEED (Facebook + Instagram).
//
// POURQUOI
// Les photos du catalogue sont stockées en 2000×3556 (ratio 0,56, du 9:16
// pur). Or Instagram n'accepte en feed qu'entre 4:5 (0,80) et 1,91:1 : en
// dehors de ces bornes il ajoute des bandes noires, et un carrousel mélangeant
// des ratios différents devient incohérent d'une diapositive à l'autre.
//
// Toutes les images du carrousel sont donc ramenées au MÊME format 4:5
// (1080×1350), le plus haut qu'Instagram tolère — c'est celui qui occupe le
// plus de surface dans le fil, donc le plus visible.
//
// Le recadrage est centré : le filigrane HOOMY est incrusté au centre des
// photos, un recadrage centré le conserve donc intact et jamais déformé.
//
// Ne concerne QUE le feed. Le visuel de story 1080×1920 (./visuel.ts) est
// composé différemment et reste inchangé.

export const FEED_L = 1080;
export const FEED_H = 1350; // 4:5

const QUALITE = 85;
const POIDS_MAX = 8 * 1024 * 1024; // limite Meta
const QUALITES_REPLI = [75, 65, 55];

export type InfosNormalisation = {
  largeurAvant: number;
  hauteurAvant: number;
  poidsAvant: number;
  largeurApres: number;
  hauteurApres: number;
  poidsApres: number;
  qualite: number;
};

/**
 * Ramène une photo au format 4:5 (1080×1350).
 *
 * `fit: "cover"` + `position: "centre"` : l'image couvre tout le cadre et le
 * débord est rogné depuis les bords — jamais d'étirement, jamais de
 * déformation. Une photo verticale perd du haut et du bas, une photo
 * horizontale perd des côtés ; dans les deux cas le centre est préservé.
 *
 * Sortie JPEG sRGB sans métadonnées (sharp ne les recopie pas par défaut),
 * qualité 85, dégradée par paliers si le poids dépassait la limite Meta —
 * ce qui n'arrive pas à cette taille, mais la garantie est explicite.
 */
export async function normaliserPhotoFeed(
  source: Buffer
): Promise<{ jpeg: Buffer; infos: InfosNormalisation }> {
  const sharp = (await import("sharp")).default;

  const avant = await sharp(source).metadata();

  // Une photo PLUS LARGE que le cadre 4:5 (ratio > 0,8) serait rognée sur les
  // côtés par un « cover » → effet « zoomé » sur les paysages. Pour celles-là,
  // on affiche la photo ENTIÈRE (contain) posée sur un fond flou d'elle-même.
  // Les photos plus HAUTES que 4:5 (portraits) gardent le cover : le rognage
  // haut/bas y est minime et elles remplissent joliment le cadre.
  const ratio = (avant.width ?? 0) / (avant.height ?? 1);
  const estPaysage = ratio > FEED_L / FEED_H;

  const encoder = async (qualite: number): Promise<Buffer> => {
    if (!estPaysage) {
      return sharp(source)
        .resize(FEED_L, FEED_H, { fit: "cover", position: "centre" })
        .toColourspace("srgb")
        .jpeg({ quality: qualite, chromaSubsampling: "4:2:0", mozjpeg: true })
        .toBuffer();
    }

    // Paysage : fond = même photo en « cover » flouté et légèrement assombri ;
    // premier plan = photo entière (contain) centrée. Aucun rognage, aucun zoom.
    const [fond, premierPlan] = await Promise.all([
      sharp(source)
        .resize(FEED_L, FEED_H, { fit: "cover", position: "centre" })
        .blur(30)
        .modulate({ brightness: 0.9 })
        .toBuffer(),
      sharp(source)
        .resize(FEED_L, FEED_H, { fit: "inside" })
        .toBuffer(),
    ]);

    return sharp(fond)
      .composite([{ input: premierPlan, gravity: "centre" }])
      .toColourspace("srgb")
      .jpeg({ quality: qualite, chromaSubsampling: "4:2:0", mozjpeg: true })
      .toBuffer();
  };

  let qualite = QUALITE;
  let jpeg = await encoder(qualite);

  for (const repli of QUALITES_REPLI) {
    if (jpeg.length <= POIDS_MAX) break;
    qualite = repli;
    jpeg = await encoder(qualite);
  }

  if (jpeg.length > POIDS_MAX) {
    throw new Error(
      `Photo encore trop lourde après compression (${(jpeg.length / 1024 / 1024).toFixed(1)} Mo > 8 Mo).`
    );
  }

  return {
    jpeg,
    infos: {
      largeurAvant: avant.width ?? 0,
      hauteurAvant: avant.height ?? 0,
      poidsAvant: source.length,
      largeurApres: FEED_L,
      hauteurApres: FEED_H,
      poidsApres: jpeg.length,
      qualite,
    },
  };
}

/** Résumé lisible d'une normalisation, pour le journal du worker. */
export function resumerNormalisation(index: number, i: InfosNormalisation): string {
  const ko = (o: number) => `${Math.round(o / 1024)} Ko`;
  const ratio = i.hauteurAvant ? (i.largeurAvant / i.hauteurAvant).toFixed(2) : "?";
  return (
    `photo ${index} : ${i.largeurAvant}×${i.hauteurAvant} (ratio ${ratio}, ${ko(i.poidsAvant)}) ` +
    `→ ${i.largeurApres}×${i.hauteurApres} (4:5, ${ko(i.poidsApres)}, qualité ${i.qualite})`
  );
}
