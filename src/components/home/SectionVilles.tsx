import Link from "next/link";

const VILLES = [
  "Casablanca",
  "Marrakech",
  "Rabat",
  "Tanger",
  "Agadir",
  "Fès",
] as const;

type Props = {
  comptesParVille: Record<string, number>;
};

function formaterAnnonces(n: number): string {
  if (n === 0) return "Bientôt disponible";
  if (n === 1) return "1 annonce";
  return `${n.toLocaleString("fr-FR")} annonces`;
}

export default function SectionVilles({ comptesParVille }: Props) {
  return (
    <section className="py-16 px-6" style={{ background: "#F2ECDD" }}>
      <div className="max-w-6xl mx-auto">
        <h2
          className="text-3xl font-normal text-center mb-3"
          style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}
        >
          Explorer par ville
        </h2>
        <p className="text-center text-sm mb-10" style={{ color: "#666" }}>
          Découvrez les meilleures opportunités immobilières dans les grandes villes du Maroc.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {VILLES.map((nom) => {
            const count = comptesParVille[nom] ?? 0;
            return (
              <Link
                key={nom}
                href={`/acheter?ville=${nom}`}
                className="relative overflow-hidden rounded-2xl h-40 flex flex-col justify-end p-5 transition-transform hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(135deg, #0F4C3A 0%, #146C43 100%)",
                  textDecoration: "none",
                }}
              >
                {/* Motif décoratif */}
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: "radial-gradient(circle at 80% 20%, #D4AF37 0%, transparent 60%)",
                  }}
                />
                <p
                  className="relative text-xl font-normal"
                  style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--fond-secondaire)" }}
                >
                  {nom}
                </p>
                <p className="relative text-xs mt-1" style={{ color: "var(--accent)" }}>
                  {formaterAnnonces(count)}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
