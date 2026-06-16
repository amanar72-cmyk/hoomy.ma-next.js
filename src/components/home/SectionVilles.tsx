import Link from "next/link";

const VILLES = [
  { nom: "Casablanca", annonces: "2 400+" },
  { nom: "Marrakech", annonces: "1 800+" },
  { nom: "Rabat", annonces: "980+" },
  { nom: "Tanger", annonces: "750+" },
  { nom: "Agadir", annonces: "620+" },
  { nom: "Fès", annonces: "430+" },
];

export default function SectionVilles() {
  return (
    <section className="py-16 px-6" style={{ background: "#F2ECDD" }}>
      <div className="max-w-6xl mx-auto">
        <h2
          className="text-3xl font-normal text-center mb-3"
          style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}
        >
          Explorer par ville
        </h2>
        <p className="text-center text-sm mb-10" style={{ color: "#666" }}>
          Découvrez les meilleures opportunités immobilières dans les grandes villes du Maroc.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {VILLES.map((ville) => (
            <Link
              key={ville.nom}
              href={`/acheter?ville=${ville.nom}`}
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
                style={{ fontFamily: "var(--font-marcellus), serif", color: "#fff" }}
              >
                {ville.nom}
              </p>
              <p className="relative text-xs mt-1" style={{ color: "#D4AF37" }}>
                {ville.annonces} annonces
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
