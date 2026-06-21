import { MOCK_QUARTIERS } from "@/lib/pro/mockData";

export default function PageProQuartiers() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-normal mb-1"
          style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
          Mes Quartiers
        </h1>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>
          Zones suivies — données de démonstration
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MOCK_QUARTIERS.map((q) => (
          <div key={q.id} className="rounded-2xl border p-5"
            style={{ background: "#fff", borderColor: "#F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.05)" }}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium" style={{ color: "#1f2a24" }}>{q.nom}</p>
                <p className="text-xs" style={{ color: "#9DB8AD" }}>{q.ville}</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "#D1FAE5", color: "#065F46" }}>
                {q.evolution}
              </span>
            </div>
            <p className="text-sm mb-3" style={{ color: "#6B7A71" }}>{q.description}</p>
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-lg font-semibold" style={{ color: "#0F4C3A" }}>{q.biens_actifs}</p>
                <p className="text-xs" style={{ color: "#9DB8AD" }}>Biens actifs</p>
              </div>
              <div>
                <p className="text-lg font-semibold" style={{ color: "#0F4C3A", fontFamily: "var(--font-marcellus),serif" }}>
                  {q.prix_moyen}
                </p>
                <p className="text-xs" style={{ color: "#9DB8AD" }}>Prix moyen</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
