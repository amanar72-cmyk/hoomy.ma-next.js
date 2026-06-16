import type { Bien } from "@/lib/types";

function formatPrix(prix: number, transaction: string) {
  return `${prix.toLocaleString("fr-FR")} DH${transaction === "location" ? "/mois" : ""}`;
}

export default function InfosBien({ bien }: { bien: Bien }) {
  const equipements = bien.equipements ?? [];

  return (
    <div>
      {/* Référence */}
      {bien.reference && (
        <p className="text-sm mb-2" style={{ color: "#B4AD97" }}>
          {bien.reference}
        </p>
      )}

      {/* Titre H1 */}
      <h1
        className="text-4xl font-normal mb-4 leading-tight"
        style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}
      >
        {bien.titre}
      </h1>

      {/* Prix */}
      <p className="text-3xl font-semibold mb-3" style={{ color: "#D4AF37" }}>
        {formatPrix(bien.prix, bien.transaction)}
      </p>

      {/* Ville + quartier */}
      <p className="flex items-center gap-1.5 text-base mb-7" style={{ color: "#6B6450" }}>
        <span aria-hidden="true">📍</span>
        {bien.quartier ? `${bien.quartier}, ` : ""}{bien.ville}
      </p>

      {/* Rangée caractéristiques */}
      <div
        className="flex flex-wrap items-center gap-6 py-5 mb-8 border-t border-b"
        style={{ borderColor: "#E8E2D2" }}
      >
        <div className="text-center">
          <p className="text-2xl font-semibold" style={{ color: "#0F4C3A" }}>{bien.surface}</p>
          <p className="text-xs mt-0.5" style={{ color: "#888" }}>m²</p>
        </div>
        <div className="w-px h-10" style={{ background: "#E8E2D2" }} />
        <div className="text-center">
          <p className="text-2xl font-semibold" style={{ color: "#0F4C3A" }}>
            <span aria-hidden="true">🛏</span> {bien.chambres}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#888" }}>chambres</p>
        </div>
        <div className="w-px h-10" style={{ background: "#E8E2D2" }} />
        <div className="text-center">
          <p className="text-2xl font-semibold" style={{ color: "#0F4C3A" }}>
            <span aria-hidden="true">🚿</span> {bien.salles_bain}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#888" }}>salles de bain</p>
        </div>
        <div className="w-px h-10" style={{ background: "#E8E2D2" }} />
        <div>
          <p className="text-base font-medium" style={{ color: "#0F4C3A" }}>{bien.type}</p>
          <p className="text-xs mt-0.5" style={{ color: "#888" }}>type de bien</p>
        </div>
      </div>

      {/* Description */}
      {bien.description && (
        <section className="mb-10">
          <h2
            className="text-xl font-normal mb-4"
            style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}
          >
            Description
          </h2>
          <p className="leading-relaxed whitespace-pre-line text-sm" style={{ color: "#3D4A42" }}>
            {bien.description}
          </p>
        </section>
      )}

      {/* Équipements */}
      {equipements.length > 0 && (
        <section>
          <h2
            className="text-xl font-normal mb-5"
            style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}
          >
            Équipements
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {equipements.map((e) => (
              <div key={e} className="flex items-center gap-2.5 text-sm" style={{ color: "#3D4A42" }}>
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{ background: "rgba(20,108,67,0.12)", color: "#146C43" }}
                >
                  ✓
                </span>
                {e}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
