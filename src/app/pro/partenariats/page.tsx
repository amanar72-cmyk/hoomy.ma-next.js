import { MOCK_PARTENARIATS } from "@/lib/pro/mockData";

const ICONES: Record<string, string> = {
  Notaire: "⚖️",
  Banque: "🏦",
  Architecte: "📐",
  Diagnostiqueur: "🔍",
  Autre: "🤝",
};

export default function PageProPartenariats() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-normal mb-1"
            style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
            Mes partenariats
          </h1>
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            {MOCK_PARTENARIATS.length} partenaires — données de démonstration
          </p>
        </div>
        <button type="button"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
          style={{ background: "#0F4C3A", color: "#fff" }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Ajouter un partenaire
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MOCK_PARTENARIATS.map((p) => (
          <div key={p.id} className="rounded-2xl border p-5"
            style={{ background: "#fff", borderColor: "#F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.05)" }}>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: "#F4F6F5" }}>
                {ICONES[p.type] ?? "🤝"}
              </div>
              <div>
                <p className="font-medium text-sm" style={{ color: "#1f2a24" }}>{p.partenaire}</p>
                <p className="text-xs" style={{ color: "#9DB8AD" }}>{p.type} · {p.ville}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1 text-xs mb-3" style={{ color: "#6B7A71" }}>
              <span>👤 {p.contact}</span>
              <span>📞 {p.telephone}</span>
            </div>
            <div className="rounded-xl p-3" style={{ background: "#F4F6F5" }}>
              <p className="text-xs" style={{ color: "#6B7A71" }}>
                <span className="font-medium" style={{ color: "#0F4C3A" }}>Avantage : </span>
                {p.avantage}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
