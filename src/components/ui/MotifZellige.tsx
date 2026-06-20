/**
 * Motifs géométriques zellige marocains — utilisés en filigrane discret.
 *
 * Le khatam (خاتم) est l'étoile à 8 branches emblématique du zellige
 * marocain, formée par l'entrelacement de deux carrés à 45°.
 * Toutes les couleurs passent par les tokens CSS → adaptation jour/nuit auto.
 *
 * Exports :
 *   KhataM          — étoile khatam unique (ornement, séparateur)
 *   FondZellige     — motif répété couvrant un fond (section texture)
 *   SeparateurZellige — ligne ornée d'un khatam central
 */

// ── Chemin SVG du khatam dans un viewBox 100×100, centre (50,50) ──────────────
// Calculé avec R_ext=46 (pointes) et R_int=19 (creux), ratio ~0.414 (authentique)
const KHATAM =
  "M50,4 L57.3,32.5 L82.5,17.5 L67.5,42.7 L96,50 L67.5,57.3 " +
  "L82.5,82.5 L57.3,67.5 L50,96 L42.7,67.5 L17.5,82.5 L32.5,57.3 " +
  "L4,50 L32.5,42.7 L17.5,17.5 L42.7,32.5 Z";

// Octogone intérieur (rosette du khatam) — relie les 8 creux
const ROSETTE =
  "M57.3,32.5 L67.5,42.7 L67.5,57.3 L57.3,67.5 " +
  "L42.7,67.5 L32.5,57.3 L32.5,42.7 L42.7,32.5 Z";

// ── KhataM ────────────────────────────────────────────────────────────────────

type PropsKhatam = {
  /** Taille en px du côté du carré englobant (défaut : 40) */
  size?: number;
  /** Couleur CSS — accepte les tokens et rgba() */
  couleur?: string;
  /** Opacité globale du motif (défaut : 1, régler très bas pour filigrane) */
  opacite?: number;
  /** Épaisseur du trait en stroke mode (défaut : 1.8) */
  epais?: number;
  /** true = étoile pleine, false = contour seul (défaut : false) */
  plein?: boolean;
  /** Afficher la rosette intérieure en plus (défaut : false) */
  avecRosette?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

/** Étoile khatam unique — ornement pour séparateurs et coins décoratifs. */
export function KhataM({
  size = 40,
  couleur = "var(--accent)",
  opacite = 1,
  epais = 1.8,
  plein = false,
  avecRosette = false,
  className,
  style,
}: PropsKhatam) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ display: "block", flexShrink: 0, ...style }}
    >
      <g opacity={opacite}>
        {plein ? (
          <path d={KHATAM} fill={couleur} />
        ) : (
          <>
            <path d={KHATAM} fill="none" stroke={couleur} strokeWidth={epais} strokeLinejoin="round" />
            {avecRosette && (
              <path d={ROSETTE} fill="none" stroke={couleur} strokeWidth={epais * 0.55} strokeLinejoin="round" />
            )}
          </>
        )}
      </g>
    </svg>
  );
}

// ── FondZellige ───────────────────────────────────────────────────────────────

type PropsFond = {
  /** Couleur des tracés (token CSS ou rgba) */
  couleur?: string;
  /** Opacité globale (défaut : 0.06 — filigrane très discret) */
  opacite?: number;
  /** Taille d'une cellule du motif répété en px (défaut : 80) */
  taille?: number;
  /** true = étoiles pleines, false = contours (défaut : false) */
  plein?: boolean;
  /** ID unique pour le SVG pattern — évite les collisions si utilisé plusieurs fois */
  patternId?: string;
  /** Style complémentaire de l'élément SVG (position, dimensions…) */
  style?: React.CSSProperties;
};

/**
 * Motif zellige répété — couvre toute la surface de son parent.
 * Le parent DOIT avoir `position: relative` (ou absolute) et `overflow: hidden`.
 * Toujours accompagné d'un `pointer-events-none` sur le parent ou ici.
 */
export function FondZellige({
  couleur = "var(--accent)",
  opacite = 0.06,
  taille = 80,
  plein = false,
  patternId = "zellige-fond",
  style,
}: PropsFond) {
  // Calcul : dans une cellule `taille×taille`, l'étoile occupe 60% (0.6 de taille).
  // Le khatam SVG source a un rayon visuel de 46px dans un viewBox 100px.
  // scale = (taille * 0.6) / 100   → centre à (50*scale)
  // tx = taille/2 - 50*scale       → recentre l'étoile dans la cellule
  const scale = (taille * 0.58) / 100;
  const center = 50 * scale;
  const tx = taille / 2 - center;
  const ty = tx;
  const epaisseur = Math.max(1.2, 160 / taille); // trait plus fin pour grandes cellules

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        ...style,
      }}
    >
      <defs>
        <pattern
          id={patternId}
          x="0"
          y="0"
          width={taille}
          height={taille}
          patternUnits="userSpaceOnUse"
        >
          <g
            transform={`translate(${tx.toFixed(2)}, ${ty.toFixed(2)}) scale(${scale.toFixed(4)})`}
            opacity={opacite}
          >
            {plein ? (
              <path d={KHATAM} fill={couleur} />
            ) : (
              <>
                <path
                  d={KHATAM}
                  fill="none"
                  stroke={couleur}
                  strokeWidth={epaisseur}
                  strokeLinejoin="round"
                />
                <path
                  d={ROSETTE}
                  fill="none"
                  stroke={couleur}
                  strokeWidth={epaisseur * 0.55}
                  strokeLinejoin="round"
                />
              </>
            )}
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

// ── SeparateurZellige ─────────────────────────────────────────────────────────

type PropsSeparateur = {
  couleur?: string;
  opacite?: number;
  /** Taille du khatam central en px (défaut : 20) */
  tailleEtoile?: number;
  /** Couleur des lignes horizontales (défaut : var(--bordure)) */
  couleurLignes?: string;
  className?: string;
};

/**
 * Séparateur horizontal orné d'un khatam central en gold.
 * Remplace une simple ligne `<hr>` par un accent marocain discret.
 */
export function SeparateurZellige({
  couleur = "var(--accent)",
  opacite = 0.45,
  tailleEtoile = 20,
  couleurLignes = "var(--bordure)",
  className,
}: PropsSeparateur) {
  return (
    <div
      className={className}
      aria-hidden="true"
      style={{ display: "flex", alignItems: "center", gap: 12 }}
    >
      <div style={{ flex: 1, height: 1, background: couleurLignes }} />
      <KhataM
        size={tailleEtoile}
        couleur={couleur}
        opacite={opacite}
        plein={true}
      />
      <div style={{ flex: 1, height: 1, background: couleurLignes }} />
    </div>
  );
}
