// Squelette de chargement des listes /acheter et /louer — formes exactes
// des cartes annonces (photo 4:3, prix, titre, localisation, specs).
// CSS pur (animate-pulse Tailwind) : zéro JS, zéro coût PageSpeed.

function CarteSquelette() {
  return (
    <div
      className="rounded-2xl overflow-hidden animate-pulse"
      style={{ background: "var(--fond-secondaire)", border: "1px solid #EDE7D7" }}
    >
      {/* Photo */}
      <div style={{ aspectRatio: "4 / 3", background: "#EDE9DD" }} />

      <div className="px-5 pt-4 pb-5">
        {/* Prix */}
        <div className="h-5 w-32 rounded-md mb-3" style={{ background: "#E8E2D2" }} />
        {/* Titre (2 lignes) */}
        <div className="h-3.5 w-full rounded-md mb-1.5" style={{ background: "#F0EDE5" }} />
        <div className="h-3.5 w-2/3 rounded-md mb-3" style={{ background: "#F0EDE5" }} />
        {/* Localisation */}
        <div className="h-3 w-1/2 rounded-md mb-4" style={{ background: "#F0EDE5" }} />
        {/* Séparateur */}
        <div className="h-px mb-3" style={{ background: "var(--bordure-legere)" }} />
        {/* Specs */}
        <div className="flex gap-3">
          <div className="h-3 w-12 rounded-md" style={{ background: "#F0EDE5" }} />
          <div className="h-3 w-10 rounded-md" style={{ background: "#F0EDE5" }} />
          <div className="h-3 w-10 rounded-md" style={{ background: "#F0EDE5" }} />
        </div>
      </div>
    </div>
  );
}

export default function SqueletteListe() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 mb-8 animate-pulse">
        <div>
          <div className="h-8 w-72 rounded-lg mb-2" style={{ background: "#E8E2D2" }} />
          <div className="h-4 w-40 rounded-md" style={{ background: "#F0EDE5" }} />
        </div>
        <div className="h-10 w-44 rounded-xl" style={{ background: "#F0EDE5" }} />
      </div>

      {/* Grille de cartes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
        {Array.from({ length: 6 }).map((_, i) => (
          <CarteSquelette key={i} />
        ))}
      </div>
    </div>
  );
}
