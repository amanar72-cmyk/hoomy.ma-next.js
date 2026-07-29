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

// ── Géométrie (toutes les valeurs du cahier des charges) ──────────────────
const L = 1080;
const H = 1920;
const MARGE = 60;
const PHOTO_L = 960;
const PHOTO_H = 720;
const PHOTO_Y = 380;
const RAYON_PHOTO = 24;

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

function svgCalque(bien: BienVisuel): string {
  const localisation = [bien.quartier, bien.ville].filter(Boolean).join(", ");
  const ligneLieu = [bien.type, localisation].filter(Boolean).join(" · ");

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
        <rect x="${x}" y="1360" width="${largeur.toFixed(1)}" height="${HAUT_PASTILLE}" rx="40"
              fill="none" stroke="${OR}" stroke-opacity="0.35" stroke-width="2"/>
        ${chemin("corps", texte, x + PAD_X, 1360 + HAUT_PASTILLE / 2 + 9, TAILLE_PASTILLE, "#FFFFFF")}`;
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
  ${chemin("corps", ligneLieu, MARGE, 1180, 30, "#FFFFFF", 0.65)}

  <!-- Prix -->
  ${chemin("titre", formaterPrixVisuel(bien.prix), MARGE, 1268, 76, OR)}

  ${svgPastilles}

  <!-- Pied de page -->
  <line x1="${MARGE}" y1="1790" x2="${L - MARGE}" y2="1790" stroke="${OR}" stroke-opacity="0.2" stroke-width="2"/>
  ${chemin("corps", bien.reference ? `Réf. ${bien.reference}` : "", MARGE, 1840, 28, "#FFFFFF", 0.45)}
  ${chemin("corps", "Lien en bio", L - MARGE - largeurLien, 1840, 28, OR)}
</svg>`;
}

/**
 * Compose le visuel final. `photoBuffer` est la photo brute du bien ;
 * elle est recadrée en 960×720 sur la zone la plus « intéressante »
 * (fit cover + position attention) puis arrondie.
 */
export async function composerStory(photoBuffer: Buffer, bien: BienVisuel): Promise<Buffer> {
  // Le SVG produit ne contient que des <path> : aucune police à résoudre au
  // moment du rendu, donc aucune dépendance à l'environnement d'exécution.
  const sharp = (await import("sharp")).default;

  const photo = await sharp(photoBuffer)
    .resize(PHOTO_L, PHOTO_H, { fit: "cover", position: "attention" })
    .composite([
      {
        // Masque d'arrondi : le canal alpha du rect découpe la photo.
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
