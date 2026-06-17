import { MOCK_CALENDRIER } from "@/lib/pro/mockData";

const COULEURS_TYPE: Record<string, { bg: string; color: string; border: string }> = {
  "RDV client": { bg: "#DBEAFE", color: "#1E40AF", border: "#BFDBFE" },
  "Visite":     { bg: "#D1FAE5", color: "#065F46", border: "#6EE7B7" },
  "Signature":  { bg: "#FDE68A", color: "#78350F", border: "#FCD34D" },
  "Réunion":    { bg: "#EDE9FE", color: "#5B21B6", border: "#C4B5FD" },
  "Tâche":      { bg: "#F3F4F6", color: "#374151", border: "#D1D5DB" },
};

export default function PageProCalendrier() {
  const auj = new Date().toLocaleDateString("fr-MA", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-normal mb-1"
          style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
          Mon calendrier
        </h1>
        <p className="text-sm capitalize" style={{ color: "#9DB8AD" }}>
          {auj} · données de démonstration
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {MOCK_CALENDRIER.map((ev) => {
          const col = COULEURS_TYPE[ev.type] ?? COULEURS_TYPE["Tâche"];
          return (
            <div key={ev.id} className="rounded-2xl border flex gap-4 p-4"
              style={{ background: "#fff", borderColor: "#F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.05)" }}>
              {/* Heure */}
              <div className="flex flex-col items-center justify-center px-3 rounded-xl flex-shrink-0"
                style={{ background: "#F4F6F5", minWidth: 60 }}>
                <p className="text-base font-bold" style={{ color: "#0F4C3A" }}>{ev.heure}</p>
                <p className="text-xs" style={{ color: "#9DB8AD" }}>
                  {new Date(ev.date).toLocaleDateString("fr-MA", { day: "2-digit", month: "short" })}
                </p>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs px-2 py-0.5 rounded-full border font-medium"
                    style={{ background: col.bg, color: col.color, borderColor: col.border }}>
                    {ev.type}
                  </span>
                </div>
                <p className="font-medium text-sm mb-1 line-clamp-1" style={{ color: "#1f2a24" }}>{ev.titre}</p>
                <p className="text-xs" style={{ color: "#9DB8AD" }}>📍 {ev.lieu}</p>
                {ev.client !== "—" && (
                  <p className="text-xs mt-0.5" style={{ color: "#9DB8AD" }}>👤 {ev.client}</p>
                )}
                {ev.bien_ref !== "—" && (
                  <p className="text-xs mt-0.5" style={{ color: "#9DB8AD" }}>🏠 Réf. {ev.bien_ref}</p>
                )}
              </div>

              <button type="button" className="self-start p-1.5 rounded-lg cursor-pointer"
                style={{ background: "#F4F6F5", color: "#6B7A71" }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
