import { MOCK_NEUF } from "@/lib/pro/mockData";
import BadgeStatut from "@/components/pro/BadgeStatut";

function formaterPrix(p: string) { return p; }

export default function PageProNeuf() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-normal mb-1"
          style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
          Immobilier neuf
        </h1>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>
          Programmes disponibles — données de démonstration
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {MOCK_NEUF.map((b) => (
          <div key={b.id} className="rounded-2xl border overflow-hidden"
            style={{ background: "#fff", borderColor: "#F0EDE5", boxShadow: "0 2px 16px rgba(15,76,58,0.05)" }}>
            <div className="flex items-center justify-center"
              style={{ height: 160, background: "linear-gradient(135deg,#0F4C3A,#146C43)" }}>
              <svg width="56" height="56" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.4)" strokeWidth="1">
                <rect x="2" y="7" width="20" height="15" rx="1" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="font-medium text-sm" style={{ color: "#1f2a24" }}>{b.titre}</p>
                <BadgeStatut statut={b.statut} small />
              </div>
              <p className="text-xs mb-3" style={{ color: "#9DB8AD" }}>{b.promoteur}</p>
              <div className="flex flex-col gap-1 text-xs" style={{ color: "#6B7A71" }}>
                <span>📍 {b.quartier}, {b.ville}</span>
                <span>🏠 {b.type} · {b.surface_min}–{b.surface_max} m²</span>
                <span>📅 Livraison {b.livraison}</span>
              </div>
              <div className="mt-3 pt-3 border-t flex items-center justify-between"
                style={{ borderColor: "#F0EDE5" }}>
                <div>
                  <p className="text-xs" style={{ color: "#9DB8AD" }}>À partir de</p>
                  <p className="font-semibold text-sm" style={{ color: "#0F4C3A", fontFamily: "var(--font-marcellus),serif" }}>
                    {formaterPrix(b.prix_partir)}
                  </p>
                </div>
                <button type="button"
                  className="text-xs px-3 py-1.5 rounded-lg cursor-pointer"
                  style={{ background: "#D4AF37", color: "#0F4C3A", fontWeight: 600 }}>
                  Voir détails
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
