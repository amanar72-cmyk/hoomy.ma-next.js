import "server-only";
import path from "node:path";

// Composition du visuel de story 1080×1920 (Facebook / Instagram).
//
// ── Piège n°1 : les polices ────────────────────────────────────────────────
// sharp rend le SVG via librsvg, qui résout les polices par FONTCONFIG, sur
// le SYSTÈME. Les polices chargées par next/font n'existent QUE dans le
// navigateur : côté serveur, librsvg ne les voit pas et retombe
// silencieusement sur une police générique — sans erreur, sans avertissement.
// On pointe donc fontconfig vers public/fonts/ (Marcellus + Outfit en .ttf,
// versionnés dans le dépôt) AVANT que sharp ne s'initialise. D'où l'import
// dynamique plus bas : en ESM les imports sont hissés, un `import sharp`
// statique s'exécuterait avant ces affectations.
//
// ── Piège n°2 : l'échappement ──────────────────────────────────────────────
// Tout texte dynamique est injecté dans un SVG. Un titre contenant « & »
// (« Riad & Spa ») produit un XML invalide : librsvg abandonne le rendu du
// bloc concerné sans lever d'exception. Tout passe par echapperXml().

const RACINE_POLICES = path.resolve(process.cwd(), "public/fonts");
process.env.FONTCONFIG_FILE = path.join(RACINE_POLICES, "fonts.conf");
process.env.FONTCONFIG_PATH = RACINE_POLICES;

// ── Charte ────────────────────────────────────────────────────────────────
const VERT_ROYAL = "#0F4C3A";
const OR = "#D4AF37";
const TITRE = "Marcellus";
const CORPS = "Outfit";

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

/** Échappement XML — indispensable, voir piège n°2 en tête de fichier. */
function echapperXml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** « 1 500 000 DH » — espaces insécables fines comme séparateurs. */
export function formaterPrixVisuel(prix: number | null): string {
  if (prix === null || !Number.isFinite(prix)) return "Prix sur demande";
  return `${Math.round(prix).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} DH`;
}

/**
 * Largeur approchée d'un texte — librsvg ne sait pas mesurer avant rendu, et
 * les pastilles doivent être dimensionnées AVANT. Outfit est proche d'une
 * chasse moyenne de 0,52 em ; la marge d'erreur est absorbée par le padding.
 */
function largeurApprochee(texte: string, taillePolice: number): number {
  return Math.ceil(texte.length * taillePolice * 0.52);
}

/** Pastilles : surface, chambres, salles de bain — 3 maximum, vides ignorées. */
function pastilles(bien: BienVisuel): string[] {
  const p: string[] = [];
  if (bien.surface) p.push(`${bien.surface} m²`);
  if (bien.chambres) p.push(`${bien.chambres} chambre${bien.chambres > 1 ? "s" : ""}`);
  if (bien.salles_bain) p.push(`${bien.salles_bain} sdb`);
  return p.slice(0, 3);
}

function svgCalque(bien: BienVisuel): string {
  const localisation = [bien.quartier, bien.ville].filter(Boolean).join(", ");
  const ligneLieu = [bien.type, localisation].filter(Boolean).join(" · ");

  // ── Pastilles posées de gauche à droite depuis la marge ──
  const TAILLE_PASTILLE = 26;
  const PAD_X = 32;
  const HAUT_PASTILLE = 26 + 16 * 2; // texte + padding vertical 16
  let curseurX = MARGE;
  const svgPastilles = pastilles(bien)
    .map((texte) => {
      const largeur = largeurApprochee(texte, TAILLE_PASTILLE) + PAD_X * 2;
      const x = curseurX;
      curseurX += largeur + 16;
      return `
        <rect x="${x}" y="1360" width="${largeur}" height="${HAUT_PASTILLE}" rx="40"
              fill="none" stroke="${OR}" stroke-opacity="0.35" stroke-width="2"/>
        <text x="${x + largeur / 2}" y="${1360 + HAUT_PASTILLE / 2 + 9}" text-anchor="middle"
              font-family="${CORPS}" font-size="${TAILLE_PASTILLE}" fill="#FFFFFF">${echapperXml(texte)}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${H}">
  <rect width="${L}" height="${H}" fill="${VERT_ROYAL}"/>

  <!-- En-tête : monogramme encadré or + nom de marque -->
  <rect x="${MARGE}" y="60" width="90" height="90" rx="8" fill="none" stroke="${OR}" stroke-width="2"/>
  <text x="${MARGE + 45}" y="123" text-anchor="middle" font-family="${TITRE}" font-size="54" fill="${OR}">H</text>
  <text x="${MARGE + 118}" y="119" font-family="${CORPS}" font-size="34" fill="${OR}" letter-spacing="6">HOOMY.MA</text>

  <!-- Localisation sous la photo -->
  <text x="${MARGE}" y="1180" font-family="${CORPS}" font-size="30"
        fill="#FFFFFF" fill-opacity="0.65">${echapperXml(ligneLieu)}</text>

  <!-- Prix -->
  <text x="${MARGE}" y="1268" font-family="${TITRE}" font-size="76"
        fill="${OR}">${echapperXml(formaterPrixVisuel(bien.prix))}</text>

  ${svgPastilles}

  <!-- Pied de page -->
  <line x1="${MARGE}" y1="1790" x2="${L - MARGE}" y2="1790" stroke="${OR}" stroke-opacity="0.2" stroke-width="2"/>
  <text x="${MARGE}" y="1840" font-family="${CORPS}" font-size="28"
        fill="#FFFFFF" fill-opacity="0.45">${echapperXml(bien.reference ? `Réf. ${bien.reference}` : "")}</text>
  <text x="${L - MARGE}" y="1840" text-anchor="end" font-family="${CORPS}" font-size="28" fill="${OR}">Lien en bio</text>
</svg>`;
}

/**
 * Compose le visuel final. `photoBuffer` est la photo brute du bien ;
 * elle est recadrée en 960×720 sur la zone la plus « intéressante »
 * (fit cover + position attention) puis arrondie.
 */
export async function composerStory(photoBuffer: Buffer, bien: BienVisuel): Promise<Buffer> {
  // Import dynamique volontaire : garantit que FONTCONFIG_* (posé en tête de
  // module) est en place avant l'initialisation de sharp/librsvg.
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
