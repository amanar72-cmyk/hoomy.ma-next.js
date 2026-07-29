import "server-only";
import fs from "node:fs";
import path from "node:path";
// Imports NOMMÉS obligatoires : la build ESM d'opentype.js (opentype.mjs,
// celle que retient Turbopack) n'expose aucun export par défaut.
import { parse as analyserPolice, type Font, type Glyph } from "opentype.js";

// Rendu du texte des visuels sociaux — SANS AUCUNE POLICE SYSTÈME.
//
// POURQUOI CETTE APPROCHE
// Deux tentatives via fontconfig ont échoué en production : le visuel sortait
// avec sa mise en page mais SANS UN SEUL GLYPHE. sharp rend le SVG via
// librsvg, qui résout les polices par fontconfig — un mécanisme
// structurellement fragile ici :
//   · il dépend du répertoire de travail et d'un dossier de cache inscriptible ;
//   · surtout, fontconfig s'initialise UNE SEULE FOIS par processus. Hostinger
//     fait tourner un serveur Node persistant, et /api/og charge sharp lui
//     aussi : si cette route s'exécute la première, fontconfig est déjà figé
//     et positionner FONTCONFIG_FILE ensuite n'a plus aucun effet.
//
// On convertit donc chaque texte en CHEMINS VECTORIELS (<path>) avec
// opentype.js, comme le suggérait l'option (b) du cahier des charges. Le SVG
// ne contient plus une seule balise <text> : plus rien à résoudre, le rendu
// est identique partout, quel que soit l'hébergeur.

export type EtatPolices = {
  ok: boolean;
  sourceTrouvee: string | null;
  candidatsTestes: string[];
  erreur: string | null;
};

const FICHIERS = {
  titre: "Marcellus-Regular.ttf",
  corps: "Outfit-Regular.ttf",
} as const;

export type Famille = keyof typeof FICHIERS;

let cache: { polices: Record<Famille, Font>; etat: EtatPolices } | null = null;

function candidats(): string[] {
  return [
    ...new Set([
      path.resolve(process.cwd(), "public/fonts"),
      // Sortie `standalone` de Next.js : public/ est copié à côté du serveur.
      path.resolve(process.cwd(), "../public/fonts"),
      path.resolve(process.cwd(), ".next/standalone/public/fonts"),
    ]),
  ];
}

function chargerPolices(): { polices: Record<Famille, Font>; etat: EtatPolices } {
  if (cache) return cache;

  const testes = candidats();
  const source = testes.find((d) =>
    Object.values(FICHIERS).every((f) => {
      try {
        return fs.existsSync(path.join(d, f));
      } catch {
        return false;
      }
    })
  );

  if (!source) {
    throw new Error(
      `Polices introuvables. Emplacements testés : ${testes.join(" | ")}. ` +
        `Vérifier que public/fonts/*.ttf est bien déployé.`
    );
  }

  const lire = (fichier: string) => {
    const buf = fs.readFileSync(path.join(source, fichier));
    // Vue exacte du Buffer : .buffer seul inclurait le pool sous-jacent.
    return analyserPolice(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  };

  cache = {
    polices: { titre: lire(FICHIERS.titre), corps: lire(FICHIERS.corps) },
    etat: { ok: true, sourceTrouvee: source, candidatsTestes: testes, erreur: null },
  };
  return cache;
}

/** État de chargement — utilisé par la route de diagnostic, ne lève jamais. */
export function etatPolices(): EtatPolices {
  try {
    return chargerPolices().etat;
  } catch (e) {
    return {
      ok: false,
      sourceTrouvee: null,
      candidatsTestes: candidats(),
      erreur: e instanceof Error ? e.message : String(e),
    };
  }
}

export type TexteTrace = { d: string; largeur: number };

/**
 * Construit le chemin SVG d'un glyphe depuis son outline BRUT (unités de
 * police), en appliquant nous-mêmes l'échelle et la translation.
 *
 * On n'utilise volontairement PAS `glyph.getPath(x, y, taille)` : opentype.js
 * mémorise l'outline au premier appel et le remet mal à l'échelle lorsqu'un
 * même glyphe est ensuite demandé à une AUTRE taille. Le visuel emploie cinq
 * tailles (76, 34, 30, 28, 26) — le défaut se déclenchait donc au sein d'un
 * même rendu et injectait des « NaN » dans l'attribut d. librsvg abandonne
 * alors silencieusement la fin du chemin : en production, « 4 chambres »
 * s'affichait « 4 cham » et « Lien en bio » devenait « Lien e ».
 *
 * L'axe Y des polices est orienté vers le haut, celui de SVG vers le bas :
 * d'où la soustraction. `y` est la ligne de base.
 */
function cheminDuGlyphe(glyphe: Glyph, x: number, y: number, echelle: number): string {
  const commandes = glyphe.path?.commands;
  if (!commandes?.length) return "";

  const cx = (v: number) => (x + v * echelle).toFixed(2);
  const cy = (v: number) => (y - v * echelle).toFixed(2);

  // Une coordonnée non finie corromprait tout le reste du chemin : on ignore
  // la commande plutôt que de produire un « NaN » indétectable dans le SVG.
  const fini = (...v: number[]) => v.every(Number.isFinite);

  const morceaux: string[] = [];
  for (const c of commandes) {
    switch (c.type) {
      case "M":
        if (fini(c.x, c.y)) morceaux.push(`M${cx(c.x)} ${cy(c.y)}`);
        break;
      case "L":
        if (fini(c.x, c.y)) morceaux.push(`L${cx(c.x)} ${cy(c.y)}`);
        break;
      case "Q":
        if (fini(c.x, c.y, c.x1, c.y1)) morceaux.push(`Q${cx(c.x1)} ${cy(c.y1)} ${cx(c.x)} ${cy(c.y)}`);
        break;
      case "C":
        if (fini(c.x, c.y, c.x1, c.y1, c.x2, c.y2)) {
          morceaux.push(`C${cx(c.x1)} ${cy(c.y1)} ${cx(c.x2)} ${cy(c.y2)} ${cx(c.x)} ${cy(c.y)}`);
        }
        break;
      case "Z":
        morceaux.push("Z");
        break;
    }
  }
  return morceaux.join(" ");
}

/**
 * Convertit un texte en données de chemin SVG.
 *
 * Composition glyphe par glyphe volontaire : `font.getPath()` passe par le
 * moteur Bidi/GSUB d'opentype.js, qui lève sur Outfit
 * (« substitutionType 62 lookupType 6 not yet supported »). Le crénage est
 * appliqué manuellement, ce qui suffit largement pour du texte court.
 *
 * @param y ligne de base (baseline), pas le haut du texte.
 */
export function tracerTexte(
  famille: Famille,
  texte: string,
  x: number,
  y: number,
  taille: number,
  interLettre = 0
): TexteTrace {
  const font = chargerPolices().polices[famille];
  const echelle = taille / font.unitsPerEm;

  let curseur = x;
  const morceaux: string[] = [];
  let precedent: Glyph | null = null;

  for (const caractere of texte) {
    const glyphe = font.charToGlyph(caractere);
    if (precedent) {
      const crenage = font.getKerningValue(precedent, glyphe);
      if (Number.isFinite(crenage)) curseur += crenage * echelle;
    }

    const donnees = cheminDuGlyphe(glyphe, curseur, y, echelle);
    if (donnees) morceaux.push(donnees);

    // advanceWidth peut manquer sur un glyphe absent de la police (caractère
    // non couvert) : on avance alors d'une demi-cadratin plutôt que de
    // produire un NaN qui ferait disparaître tout le reste de la ligne.
    const avance = glyphe.advanceWidth ?? font.unitsPerEm / 2;
    curseur += avance * echelle + interLettre;
    precedent = glyphe;
  }

  return { d: morceaux.join(" "), largeur: curseur - x };
}

/** Largeur d'un texte sans le tracer — pour dimensionner les pastilles. */
export function largeurTexte(famille: Famille, texte: string, taille: number, interLettre = 0): number {
  return tracerTexte(famille, texte, 0, 0, taille, interLettre).largeur;
}
