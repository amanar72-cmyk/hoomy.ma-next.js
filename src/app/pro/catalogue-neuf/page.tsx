import { MOCK_NEUF } from "@/lib/pro/mockData";
import BadgeStatut from "@/components/pro/BadgeStatut";

export default function PageProCatalogueNeuf() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-normal mb-1"
          style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
          Catalogue neuf
        </h1>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>
          Tous les programmes — données de démonstration
        </p>
      </div>

      <div className="rounded-2xl border overflow-x-auto"
        style={{ background: "#fff", borderColor: "#F0EDE5" }}>
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr style={{ background: "#F4F6F5", borderBottom: "1px solid #F0EDE5" }}>
              {["Programme", "Promoteur", "Ville", "Type", "Prix à partir de", "Livraison", "Statut"].map((c) => (
                <th key={c} className="text-left px-4 py-3 text-xs font-medium"
                  style={{ color: "#9DB8AD" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_NEUF.map((b) => (
              <tr key={b.id} style={{ borderBottom: "1px solid #F0EDE5" }}>
                <td className="px-4 py-3 font-medium" style={{ color: "#1f2a24" }}>{b.titre}</td>
                <td className="px-4 py-3 text-xs" style={{ color: "#6B7A71" }}>{b.promoteur}</td>
                <td className="px-4 py-3 text-xs" style={{ color: "#6B7A71" }}>{b.ville}</td>
                <td className="px-4 py-3 text-xs" style={{ color: "#6B7A71" }}>{b.type}</td>
                <td className="px-4 py-3 font-medium" style={{ color: "#0F4C3A" }}>{b.prix_partir}</td>
                <td className="px-4 py-3 text-xs" style={{ color: "#6B7A71" }}>{b.livraison}</td>
                <td className="px-4 py-3"><BadgeStatut statut={b.statut} small /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
