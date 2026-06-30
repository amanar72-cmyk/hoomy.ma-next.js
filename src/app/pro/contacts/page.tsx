import { MOCK_CONTACTS } from "@/lib/pro/mockData";

const COULEURS_TYPE: Record<string, { bg: string; color: string }> = {
  acheteur:    { bg: "#DBEAFE", color: "#1E40AF" },
  vendeur:     { bg: "#D1FAE5", color: "#065F46" },
  investisseur:{ bg: "#FDE68A", color: "#78350F" },
};

export default function PageProContacts() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-normal mb-1"
            style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
            Mes contacts
          </h1>
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            {MOCK_CONTACTS.length} contacts — données de démonstration
          </p>
        </div>
        <button type="button"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
          style={{ background: "#0F4C3A", color: "#fff" }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Ajouter un contact
        </button>
      </div>

      <div className="rounded-2xl border overflow-x-auto"
        style={{ background: "#fff", borderColor: "#F0EDE5" }}>
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr style={{ background: "#F4F6F5", borderBottom: "1px solid #F0EDE5" }}>
              {["Contact", "Type", "Ville", "Budget", "Téléphone", "Depuis"].map((c) => (
                <th key={c} className="text-left px-4 py-3 text-xs font-medium"
                  style={{ color: "#9DB8AD" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_CONTACTS.map((c) => {
              const col = COULEURS_TYPE[c.type];
              return (
                <tr key={c.id} style={{ borderBottom: "1px solid #F0EDE5" }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: "#0F4C3A", color: "#D4AF37" }}>
                        {c.nom.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <p className="font-medium text-sm" style={{ color: "#1f2a24" }}>{c.nom}</p>
                        <p className="text-xs" style={{ color: "#9DB8AD" }}>{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-medium capitalize"
                      style={{ background: col.bg, color: col.color }}>
                      {c.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#6B7A71" }}>{c.ville}</td>
                  <td className="px-4 py-3 text-xs font-medium" style={{ color: "#0F4C3A" }}>{c.budget}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#6B7A71" }}>{c.telephone}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#9DB8AD" }}>
                    {new Date(c.date_contact).toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
