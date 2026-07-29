import "server-only";
import { tracerTexte, largeurTexte } from "./polices";

// Composition du visuel de story 1080×1920 (Facebook / Instagram).
//
// ── Piège n°1 : les polices ────────────────────────────────────────────────
// Résolu en supprimant complètement la dépendance aux polices système : chaque
// texte est converti en CHEMINS VECTORIELS par ./polices.ts. Le SVG ne
// contient plus une seule balise <text>, donc plus rien que librsvg doive
// résoudre via fontconfig — mécanisme qui avait produit, par deux fois en
// production, un visuel sans un seul glyphe. Voir l'explication complète en
// tête de ./polices.ts.
//
// ── Piège n°2 : l'échappement ──────────────────────────────────────────────
// Devenu sans objet : un texte converti en chemin ne contient plus que des
// coordonnées numériques. Une esperluette dans un titre ne peut plus casser
// le XML, puisqu'aucun texte brut n'est injecté dans le SVG.

// ── Charte ────────────────────────────────────────────────────────────────
const VERT_ROYAL = "#0F4C3A";
const OR = "#D4AF37";

// ── Géométrie ─────────────────────────────────────────────────────────────
// Le cadre photo du cahier des charges (960×720 à y=380) était un rectangle
// 4:3 posé dans un format 9:16 : il rognait sévèrement les photos et laissait
// près de 400 px de fond vide sous les pastilles. Le cadre est agrandi à
// 960×1180 — la photo occupe désormais 61 % de la hauteur au lieu de 37 % —
// et le bloc de texte est remonté pour occuper l'espace libéré.
const L = 1080;
const H = 1920;
const MARGE = 60;
const PHOTO_L = 960;
const PHOTO_H = 1180;
const PHOTO_Y = 210;
const RAYON_PHOTO = 24;

// Lignes de base du bloc de texte, sous la photo (qui s'arrête à 1390).
const Y_LIEU = 1480;
const Y_PRIX = 1572;
const Y_PASTILLES = 1650;

export type BienVisuel = {
  type: string | null;
  ville: string;
  quartier: string | null;
  prix: number | null;
  surface: number | null;
  chambres: number | null;
  salles_bain: number | null;
  reference: string | null;
};

/** « 1 500 000 DH » — espaces insécables fines comme séparateurs. */
export function formaterPrixVisuel(prix: number | null): string {
  if (prix === null || !Number.isFinite(prix)) return "Prix sur demande";
  return `${Math.round(prix).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} DH`;
}

/** Pastilles : surface, chambres, salles de bain — 3 maximum, vides ignorées. */
function pastilles(bien: BienVisuel): string[] {
  const p: string[] = [];
  if (bien.surface) p.push(`${bien.surface} m²`);
  if (bien.chambres) p.push(`${bien.chambres} chambre${bien.chambres > 1 ? "s" : ""}`);
  if (bien.salles_bain) p.push(`${bien.salles_bain} sdb`);
  return p.slice(0, 3);
}

/** Expose le SVG assemblé — diagnostic uniquement, aucun usage en production. */
export function svgDeDiagnostic(bien: BienVisuel): string {
  return svgCalque(bien);
}

/** Raccourci : un <path> rempli, à partir d'un texte converti en vecteurs. */
function chemin(
  famille: "titre" | "corps",
  texte: string,
  x: number,
  y: number,
  taille: number,
  couleur: string,
  opacite = 1,
  interLettre = 0
): string {
  if (!texte) return "";
  const { d } = tracerTexte(famille, texte, x, y, taille, interLettre);
  if (!d) return "";
  const op = opacite === 1 ? "" : ` fill-opacity="${opacite}"`;
  return `<path d="${d}" fill="${couleur}"${op}/>`;
}

/** « appartement » → « Appartement » : la saisie en base n'est pas normalisée. */
function capitaliser(v: string | null): string | null {
  if (!v) return v;
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function svgCalque(bien: BienVisuel): string {
  const localisation = [bien.quartier, bien.ville].filter(Boolean).join(", ");
  const ligneLieu = [capitaliser(bien.type), localisation].filter(Boolean).join(" · ");

  // ── Pastilles : largeur mesurée sur les vraies métriques de la police ──
  const TAILLE_PASTILLE = 26;
  const PAD_X = 32;
  const HAUT_PASTILLE = TAILLE_PASTILLE + 16 * 2; // texte + padding vertical
  let curseurX = MARGE;
  const svgPastilles = pastilles(bien)
    .map((texte) => {
      const largeurTxt = largeurTexte("corps", texte, TAILLE_PASTILLE);
      const largeur = largeurTxt + PAD_X * 2;
      const x = curseurX;
      curseurX += largeur + 16;
      // Centrage horizontal exact, ligne de base optiquement centrée.
      return `
        <rect x="${x}" y="${Y_PASTILLES}" width="${largeur.toFixed(1)}" height="${HAUT_PASTILLE}" rx="40"
              fill="none" stroke="${OR}" stroke-opacity="0.35" stroke-width="2"/>
        ${chemin("corps", texte, x + PAD_X, Y_PASTILLES + HAUT_PASTILLE / 2 + 9, TAILLE_PASTILLE, "#FFFFFF")}`;
    })
    .join("");

  // Monogramme centré dans son carré (mesure réelle, pas text-anchor).
  const largeurH = largeurTexte("titre", "H", 54);
  // « Lien en bio » aligné à droite : on recule de sa largeur mesurée.
  const largeurLien = largeurTexte("corps", "Lien en bio", 28);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${H}">
  <rect width="${L}" height="${H}" fill="${VERT_ROYAL}"/>

  <!-- En-tête : monogramme encadré or + nom de marque -->
  <rect x="${MARGE}" y="60" width="90" height="90" rx="8" fill="none" stroke="${OR}" stroke-width="2"/>
  ${chemin("titre", "H", MARGE + 45 - largeurH / 2, 123, 54, OR)}
  ${chemin("corps", "HOOMY.MA", MARGE + 118, 119, 34, OR, 1, 6)}

  <!-- Localisation sous la photo -->
  ${chemin("corps", ligneLieu, MARGE, Y_LIEU, 30, "#FFFFFF", 0.65)}

  <!-- Prix -->
  ${chemin("titre", formaterPrixVisuel(bien.prix), MARGE, Y_PRIX, 76, OR)}

  ${svgPastilles}

  <!-- Pied de page -->
  <line x1="${MARGE}" y1="1790" x2="${L - MARGE}" y2="1790" stroke="${OR}" stroke-opacity="0.2" stroke-width="2"/>
  ${chemin("corps", bien.reference ? `Réf. ${bien.reference}` : "", MARGE, 1840, 28, "#FFFFFF", 0.45)}
  ${chemin("corps", "Lien en bio", L - MARGE - largeurLien, 1840, 28, OR)}
</svg>`;
}

/**
 * Compose le visuel final.
 *
 * La photo est affichée ENTIÈRE (fit « inside »), jamais recadrée : le
 * recadrage précédent (fit « cover ») amputait sévèrement les prises de vue
 * dont le rapport ne correspondait pas au cadre — sur une annonce immobilière,
 * cacher la moitié du bien est un contresens.
 *
 * Le vide laissé autour est comblé par la MÊME photo, élargie pour couvrir le
 * cadre puis floutée et assombrie. Le bien reste intégralement lisible, le
 * cadre est plein, et l'ensemble gagne en profondeur.
 */
export async function composerStory(photoBuffer: Buffer, bien: BienVisuel): Promise<Buffer> {
  // Le SVG produit ne contient que des <path> : aucune police à résoudre au
  // moment du rendu, donc aucune dépendance à l'environnement d'exécution.
  const sharp = (await import("sharp")).default;

  // Arrière-plan : la photo étirée pour remplir, floutée et assombrie afin de
  // ne jamais concurrencer le sujet net posé par-dessus.
  const fond = await sharp(photoBuffer)
    .resize(PHOTO_L, PHOTO_H, { fit: "cover", position: "attention" })
    .blur(28)
    .modulate({ brightness: 0.62 })
    .toBuffer();

  // Sujet : photo complète, mise à l'échelle sans rognage.
  const sujet = await sharp(photoBuffer)
    .resize(PHOTO_L, PHOTO_H, { fit: "inside", withoutEnlargement: false })
    .toBuffer({ resolveWithObject: true });

  const photo = await sharp(fond)
    .composite([
      {
        input: sujet.data,
        // Centrage exact à partir des dimensions réelles après mise à l'échelle.
        top: Math.round((PHOTO_H - sujet.info.height) / 2),
        left: Math.round((PHOTO_L - sujet.info.width) / 2),
      },
      {
        // Masque d'arrondi : le canal alpha du rect découpe l'ensemble.
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${PHOTO_L}" height="${PHOTO_H}">
             <rect width="${PHOTO_L}" height="${PHOTO_H}" rx="${RAYON_PHOTO}" fill="#fff"/>
           </svg>`
        ),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  return sharp(Buffer.from(svgCalque(bien)))
    .composite([{ input: photo, top: PHOTO_Y, left: MARGE }])
    .jpeg({ quality: 90, chromaSubsampling: "4:4:4" })
    .toBuffer();
}
