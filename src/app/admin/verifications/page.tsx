import { createClient } from "@/lib/supabase/server";
import { verifierBien, supprimerBien } from "@/app/admin/actions";

export default async function PageAdminVerifications() {
  const supabase = await createClient();

  const { data: biens, count } = await supabase
    .from("biens")
    .select("id, reference, titre, type, transaction, prix, ville, quartier, surface, chambres, photos, cree_le", {
      count: "exact",
    })
    .eq("verifie", false)
    .order("cree_le", { ascending: true }); // les plus anciens d'abord

  function formaterPrix(prix: number, transaction: string) {
    const montant = prix.toLocaleString("fr-MA");
    return transaction === "location" ? `${montant} DH/mois` : `${montant} DH`;
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1
          className="text-2xl mb-1"
          style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}
        >
          File de vérification
        </h1>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>
          {count ?? 0} bien{(count ?? 0) > 1 ? "s" : ""} en attente de vérification
        </p>
      </div>

      {(count ?? 0) === 0 ? (
        <div
          className="rounded-2xl p-16 flex flex-col items-center justify-center text-center"
          style={{ background: "#fff", border: "1px solid #E8E2D2" }}
        >
          <span className="text-5xl mb-4">✅</span>
          <p className="text-lg font-medium mb-1" style={{ color: "#0F4C3A" }}>
            Tout est à jour !
          </p>
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            Aucun bien en attente de vérification.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {(biens ?? []).map((b) => {
            const photoUrl = Array.isArray(b.photos) && b.photos.length > 0 ? b.photos[0] : null;

            return (
              <div
                key={b.id}
                className="rounded-2xl overflow-hidden flex flex-col"
                style={{ background: "#fff", border: "1px solid #E8E2D2" }}
              >
                {/* Photo ou placeholder */}
                <div
                  className="h-44 flex items-center justify-center flex-shrink-0"
                  style={{ background: "#F4F6F5" }}
                >
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt={b.titre} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">🏠</span>
                  )}
                </div>

                {/* Infos */}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: "#9DB8AD" }}>{b.reference ?? "—"}</p>
                      <h3 className="text-sm font-semibold leading-snug" style={{ color: "#0F4C3A" }}>
                        {b.titre}
                      </h3>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 whitespace-nowrap"
                      style={{ background: "#FEF3C7", color: "#92400E" }}
                    >
                      En attente
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs mb-3" style={{ color: "#6B7A71" }}>
                    <span>🏙 {b.quartier ? `${b.quartier}, ` : ""}{b.ville}</span>
                    <span>📐 {b.surface} m²</span>
                    {b.chambres > 0 && <span>🛏 {b.chambres} ch.</span>}
                  </div>

                  <p className="text-base font-semibold mb-4" style={{ color: "#D4AF37" }}>
                    {formaterPrix(b.prix, b.transaction)}
                  </p>

                  <div className="flex gap-2 mt-auto">
                    {/* Approuver */}
                    <form action={verifierBien.bind(null, b.id)} className="flex-1">
                      <button
                        type="submit"
                        className="w-full py-2 rounded-xl text-sm font-medium cursor-pointer transition-opacity hover:opacity-90"
                        style={{ background: "#0F4C3A", color: "#fff" }}
                      >
                        ✅ Approuver
                      </button>
                    </form>
                    {/* Rejeter (supprime le bien) */}
                    <form action={supprimerBien.bind(null, b.id)}>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors"
                        style={{ background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA" }}
                      >
                        ✕ Rejeter
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
