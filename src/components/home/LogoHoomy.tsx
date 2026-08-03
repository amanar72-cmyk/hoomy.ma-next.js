// Composant logo HOOMY réutilisable : mot-symbole "HOOMY" (Marcellus) avec un
// point accent doré. Le badge « H » a été retiré (doublon avec le H de HOOMY).
// Pas de "use client" — composant de présentation pur, utilisable en Server Component.

interface Props {
  /** Conservé pour compatibilité des appelants ; n'affiche plus de badge. */
  tailleBadge?: number;
  tailleTexte?: number; // fontSize de "HOOMY" en px (défaut 19)
  couleurTexte?: string; // couleur du mot HOOMY (défaut var(--primaire))
}

export default function LogoHoomy({
  tailleTexte = 19,
  couleurTexte = "var(--primaire)",
}: Props) {
  return (
    <span
      className="inline-flex items-baseline"
      style={{ userSelect: "none", gap: Math.max(3, Math.round(tailleTexte * 0.16)) }}
    >
      <span
        style={{
          fontFamily: "var(--font-marcellus), serif",
          color: couleurTexte,
          fontSize: tailleTexte,
          letterSpacing: "0.2em",
          lineHeight: 1,
        }}
      >
        HOOMY
      </span>
      {/* Point accent doré — retouche discrète, évoque le « .ma », sans second H */}
      <span
        aria-hidden="true"
        style={{
          width: Math.max(4, Math.round(tailleTexte * 0.24)),
          height: Math.max(4, Math.round(tailleTexte * 0.24)),
          borderRadius: "50%",
          background: "var(--accent)",
          display: "inline-block",
          flexShrink: 0,
        }}
      />
    </span>
  );
}
