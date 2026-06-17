import { MOCK_DEMANDES } from "@/lib/pro/mockData";
import BadgeStatut from "@/components/pro/BadgeStatut";

export default function PageProDemandes() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-normal mb-1"
            style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
            Mes demandes
          </h1>
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            {MOCK_DEMANDES.length} demandes — données de démonstration
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {MOCK_DEMANDES.map((d) => (
          <div key={d.id} className="rounded-2xl border p-4 flex items-center gap-4 flex-wrap"
            style={{ background: "#fff", borderColor: "#F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.04)" }}>
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono" style={{ color: "#9DB8AD" }}>{d.reference}</span>
                <BadgeStatut statut={d.statut} small />
              </div>
              <p className="font-medium text-sm" style={{ color: "#1f2a24" }}>{d.client}</p>
            </div>
            <div className="flex gap-6 flex-wrap text-xs" style={{ color: "#6B7A71" }}>
              <span>🏠 {d.type_bien}</span>
              <span>{d.transaction === "vente" ? "Achat" : "Location"}</span>
              <span>📍 {d.ville}</span>
              <span className="font-medium" style={{ color: "#0F4C3A" }}>{d.budget}</span>
            </div>
            <div className="text-xs" style={{ color: "#9DB8AD" }}>
              {new Date(d.date).toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
            <button type="button"
              className="text-xs px-3 py-1.5 rounded-lg cursor-pointer"
              style={{ background: "#F4F6F5", color: "#0F4C3A" }}>
              Voir
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
