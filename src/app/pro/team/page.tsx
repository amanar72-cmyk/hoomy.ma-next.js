import { MOCK_TEAM } from "@/lib/pro/mockData";

export default function PageProTeam() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-normal mb-1"
            style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
            Ma Team
          </h1>
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            {MOCK_TEAM.length} membres — données de démonstration
          </p>
        </div>
        <button type="button"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
          style={{ background: "#0F4C3A", color: "#fff" }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Inviter un membre
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {MOCK_TEAM.map((m) => (
          <div key={m.id} className="rounded-2xl border p-5 flex flex-col gap-3"
            style={{ background: "#fff", borderColor: "#F0EDE5", boxShadow: "0 2px 16px rgba(15,76,58,0.05)" }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
                style={{ background: "#0F4C3A", color: "#D4AF37" }}>
                {m.avatar}
              </div>
              <div>
                <p className="font-medium text-sm" style={{ color: "#1f2a24" }}>{m.nom}</p>
                <p className="text-xs capitalize" style={{ color: "#9DB8AD" }}>{m.role}</p>
              </div>
            </div>
            <div className="text-xs" style={{ color: "#6B7A71" }}>{m.email}</div>
            <div className="text-xs" style={{ color: "#6B7A71" }}>{m.telephone}</div>
            <div className="flex gap-3 pt-2 border-t" style={{ borderColor: "#F0EDE5" }}>
              <div className="text-center flex-1">
                <p className="text-lg font-semibold" style={{ color: "#0F4C3A" }}>{m.biens_actifs}</p>
                <p className="text-xs" style={{ color: "#9DB8AD" }}>Biens actifs</p>
              </div>
              <div className="text-center flex-1 border-l" style={{ borderColor: "#F0EDE5" }}>
                <p className="text-lg font-semibold" style={{ color: "#D4AF37" }}>{m.leads_mois}</p>
                <p className="text-xs" style={{ color: "#9DB8AD" }}>Leads / mois</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
