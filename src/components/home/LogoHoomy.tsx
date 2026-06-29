// Composant logo HOOMY réutilisable : [badge H doré] + texte "HOOMY" Marcellus.
// Pas de "use client" — composant de présentation pur, utilisable en Server Component.

interface Props {
  tailleBadge?: number; // côté du carré H en px (défaut 30)
  tailleTexte?: number; // fontSize de "HOOMY" en px (défaut 19)
  couleurTexte?: string; // couleur du mot HOOMY (défaut var(--primaire))
}

export default function LogoHoomy({
  tailleBadge = 30,
  tailleTexte = 19,
  couleurTexte = "var(--primaire)",
}: Props) {
  return (
    <div
      className="flex items-center gap-2"
      style={{ userSelect: "none" }}
    >
      {/* ── Badge monogramme H ───────────────────────────────────────────── */}
      <div
        style={{
          width: tailleBadge,
          height: tailleBadge,
          borderRadius: 8,
          background: "#D4AF37",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-marcellus), serif",
            fontSize: Math.round(tailleBadge * 0.56),
            fontWeight: 400,
            color: "#0F4C3A",
            lineHeight: 1,
          }}
        >
          H
        </span>
      </div>

      {/* ── Nom ─────────────────────────────────────────────────────────── */}
      <span
        style={{
          fontFamily: "var(--font-marcellus), serif",
          color: couleurTexte,
          fontSize: tailleTexte,
          letterSpacing: "0.12em",
        }}
      >
        HOOMY
      </span>
    </div>
  );
}
