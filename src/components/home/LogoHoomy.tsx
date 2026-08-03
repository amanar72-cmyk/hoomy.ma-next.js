// Logo HOOMY : un « H » stylisé en MAISON (deux jambages + toit à pignon +
// barre) suivi du mot « HOOMY » (Marcellus). Le monogramme lit à la fois comme
// un H et comme un logement — distinctif, sans le badge doré d'avant.
// Composant de présentation pur (utilisable en Server Component).

interface Props {
  /** Conservé pour compatibilité des appelants ; contrôle la taille du monogramme. */
  tailleBadge?: number;
  tailleTexte?: number; // fontSize de "HOOMY" en px (défaut 19)
  couleurTexte?: string; // couleur du mot HOOMY (défaut var(--primaire))
}

export default function LogoHoomy({
  tailleBadge,
  tailleTexte = 19,
  couleurTexte = "var(--primaire)",
}: Props) {
  const taille = tailleBadge ?? Math.round(tailleTexte * 1.5);

  return (
    <span className="inline-flex items-center" style={{ userSelect: "none", gap: Math.round(tailleTexte * 0.45) }}>
      {/* ── Monogramme H-maison ─────────────────────────────────────────────── */}
      <svg
        width={taille}
        height={taille}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        {/* Toit à pignon (accent doré) */}
        <path d="M10 22 L24 8 L38 22" stroke="var(--accent)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Jambages du H (murs) */}
        <path d="M15 21 L15 40" stroke="var(--primaire)" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M33 21 L33 40" stroke="var(--primaire)" strokeWidth="3.2" strokeLinecap="round" />
        {/* Barre du H (étage) */}
        <path d="M15 30.5 L33 30.5" stroke="var(--primaire)" strokeWidth="3.2" strokeLinecap="round" />
      </svg>

      {/* ── Nom ─────────────────────────────────────────────────────────────── */}
      <span
        style={{
          fontFamily: "var(--font-marcellus), serif",
          color: couleurTexte,
          fontSize: tailleTexte,
          letterSpacing: "0.16em",
          lineHeight: 1,
        }}
      >
        HOOMY
      </span>
    </span>
  );
}
