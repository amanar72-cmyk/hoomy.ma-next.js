import { MOCK_RESSOURCES } from "@/lib/pro/mockData";

const ICONES_TYPE: Record<string, string> = {
  "Modèle": "📄",
  "Guide": "📚",
  "Formation": "🎓",
  "Outil": "🛠️",
};

const COULEURS_TYPE: Record<string, { bg: string; color: string }> = {
  "Modèle":    { bg: "#DBEAFE", color: "#1E40AF" },
  "Guide":     { bg: "#D1FAE5", color: "#065F46" },
  "Formation": { bg: "#EDE9FE", color: "#5B21B6" },
  "Outil":     { bg: "#FDE68A", color: "#78350F" },
};

export default function PageProRessources() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-normal mb-1"
          style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
          Mes ressources
        </h1>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>
          Documents et outils Pro — données de démonstration
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {MOCK_RESSOURCES.map((r) => {
          const col = COULEURS_TYPE[r.type];
          return (
            <div key={r.id} className="rounded-2xl border p-4 flex items-center gap-4 flex-wrap"
              style={{ background: "#fff", borderColor: "#F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.04)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                style={{ background: col.bg }}>
                {ICONES_TYPE[r.type] ?? "📎"}
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-sm" style={{ color: "#1f2a24" }}>{r.titre}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: col.bg, color: col.color }}>
                    {r.type}
                  </span>
                </div>
                <p className="text-xs" style={{ color: "#6B7A71" }}>{r.description}</p>
              </div>
              <div className="text-right flex-shrink-0">
                {r.taille && <p className="text-xs mb-1" style={{ color: "#9DB8AD" }}>{r.taille}</p>}
                <p className="text-xs mb-2" style={{ color: "#9DB8AD" }}>
                  {new Date(r.date).toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
                <button type="button"
                  className="text-xs px-3 py-1.5 rounded-lg cursor-pointer"
                  style={{ background: "#0F4C3A", color: "#fff", fontWeight: 600 }}>
                  Télécharger
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
