import VillesGrille from "./VillesGrille";

type Props = {
  comptesParVille: Record<string, number>;
};

export default function SectionVilles({ comptesParVille }: Props) {
  return (
    <section className="py-16 px-6" style={{ background: "#F2ECDD" }}>
      <div className="max-w-6xl mx-auto">
        {/* Fond de section fixe (#F2ECDD, ne suit pas le thème) : le titre doit
            donc rester une couleur fixe lui aussi — var(--primaire) devient or
            en mode sombre, quasi invisible sur ce beige toujours clair. */}
        <h2
          className="text-3xl font-normal text-center mb-3"
          style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}
        >
          Explorer par ville
        </h2>
        <p className="text-center text-sm mb-10" style={{ color: "#666" }}>
          Découvrez les meilleures opportunités immobilières dans les grandes villes du Maroc.
        </p>

        <VillesGrille comptesParVille={comptesParVille} />
      </div>
    </section>
  );
}
