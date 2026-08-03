// Logo HOOMY : mot-symbole « HOOMY » seul (Marcellus). Sans icône ni point.
// Composant de présentation pur (utilisable en Server Component).

interface Props {
  /** Conservé pour compatibilité des appelants ; sans effet (plus d'icône). */
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
      style={{
        fontFamily: "var(--font-marcellus), serif",
        color: couleurTexte,
        fontSize: tailleTexte,
        letterSpacing: "0.16em",
        lineHeight: 1,
        userSelect: "none",
      }}
    >
      HOOMY
    </span>
  );
}
