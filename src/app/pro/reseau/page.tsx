import { MOCK_RESEAU } from "@/lib/pro/mockData";

export default function PageProReseau() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-normal mb-1"
            style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
            Mon réseau
          </h1>
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            {MOCK_RESEAU.length} partenaires — données de démonstration
          </p>
        </div>
        <button type="button"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
          style={{ background: "#0F4C3A", color: "#fff" }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Inviter un confrère
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_RESEAU.map((m) => (
          <div key={m.id} className="rounded-2xl border p-5"
            style={{ background: "#fff", borderColor: "#F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.05)" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: "#146C43", color: "#fff" }}>
                {m.nom.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-sm" style={{ color: "#1f2a24" }}>{m.nom}</p>
                <p className="text-xs" style={{ color: "#9DB8AD" }}>{m.agence}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1 text-xs" style={{ color: "#6B7A71" }}>
              <span>📍 {m.ville}</span>
              <span>🏠 {m.specialite}</span>
              <span>📞 {m.telephone}</span>
            </div>
            <div className="mt-3 pt-3 border-t flex items-center justify-between"
              style={{ borderColor: "#F0EDE5" }}>
              <span className="text-xs" style={{ color: "#9DB8AD" }}>
                {m.transactions_communes} transaction{m.transactions_communes !== 1 ? "s" : ""} commune{m.transactions_communes !== 1 ? "s" : ""}
              </span>
              <button type="button" className="text-xs px-3 py-1 rounded-lg cursor-pointer"
                style={{ background: "#D4AF37", color: "#0F4C3A", fontWeight: 600 }}>
                Contacter
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
