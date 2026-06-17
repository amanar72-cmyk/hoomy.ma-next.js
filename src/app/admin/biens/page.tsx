import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import TableauAdmin from "@/components/admin/TableauAdmin";
import BoutonSupprimer from "@/components/admin/BoutonSupprimer";
import { verifierBien, deverifierBien } from "@/app/admin/actions";

type SearchParams = Promise<{
  ville?: string;
  type?: string;
  verifie?: string;
  q?: string;
}>;

function formaterPrix(prix: number, transaction: string) {
  const montant = prix.toLocaleString("fr-MA");
  return transaction === "location" ? `${montant} DH/mois` : `${montant} DH`;
}

export default async function PageAdminBiens({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("biens")
    .select("id, reference, titre, type, transaction, prix, ville, quartier, verifie, statut, photos, cree_le", { count: "exact" })
    .order("cree_le", { ascending: false });

  if (sp.ville) query = query.eq("ville", sp.ville);
  if (sp.type) query = query.eq("type", sp.type);
  if (sp.verifie === "true") query = query.eq("verifie", true);
  if (sp.verifie === "false") query = query.eq("verifie", false);
  if (sp.q) query = query.ilike("titre", `%${sp.q}%`);

  const { data: biens, count } = await query.limit(50);

  const VILLES = ["Casablanca", "Marrakech", "Rabat", "Tanger", "Agadir", "Fès"];
  const TYPES = ["Appartement", "Villa", "Riad", "Bureau", "Terrain"];

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl mb-1"
            style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}
          >
            Gestion des biens
          </h1>
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            {count ?? 0} bien{(count ?? 0) > 1 ? "s" : ""} au total
          </p>
        </div>
        <Link
          href="/admin/biens/nouveau"
          className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          style={{ background: "#0F4C3A", color: "#fff", textDecoration: "none" }}
        >
          <span>+</span> Nouveau bien
        </Link>
      </div>

      {/* Filtres */}
      <form method="get" className="flex flex-wrap gap-3 mb-6">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Rechercher par titre…"
          className="border rounded-xl px-4 py-2 text-sm focus:ring-2"
          style={{ borderColor: "#E0DAC8", color: "#0F4C3A", minWidth: 200 }}
        />

        <select
          name="ville"
          defaultValue={sp.ville ?? ""}
          className="border rounded-xl px-4 py-2 text-sm"
          style={{ borderColor: "#E0DAC8", color: "#0F4C3A" }}
        >
          <option value="">Toutes les villes</option>
          {VILLES.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>

        <select
          name="type"
          defaultValue={sp.type ?? ""}
          className="border rounded-xl px-4 py-2 text-sm"
          style={{ borderColor: "#E0DAC8", color: "#0F4C3A" }}
        >
          <option value="">Tous les types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          name="verifie"
          defaultValue={sp.verifie ?? ""}
          className="border rounded-xl px-4 py-2 text-sm"
          style={{ borderColor: "#E0DAC8", color: "#0F4C3A" }}
        >
          <option value="">Tous les statuts</option>
          <option value="true">Vérifiés</option>
          <option value="false">En attente</option>
        </select>

        <button
          type="submit"
          className="px-5 py-2 rounded-xl text-sm font-medium cursor-pointer"
          style={{ background: "#0F4C3A", color: "#fff" }}
        >
          Filtrer
        </button>

        {(sp.q || sp.ville || sp.type || sp.verifie) && (
          <Link
            href="/admin/biens"
            className="px-5 py-2 rounded-xl text-sm font-medium"
            style={{ background: "#F4F6F5", color: "#6B7A71" }}
          >
            Effacer
          </Link>
        )}
      </form>

      <TableauAdmin
        colonnes={["Photo", "Réf.", "Titre", "Type", "Prix", "Ville", "Statut", "Actions"]}
        estVide={(biens ?? []).length === 0}
        vide="Aucun bien ne correspond aux filtres"
      >
        {(biens ?? []).map((b) => {
          const photo = Array.isArray(b.photos) && b.photos.length > 0 ? b.photos[0] : null;
          return (
          <tr key={b.id} style={{ borderBottom: "1px solid #F0EDE5" }}>
            {/* Photo */}
            <td className="px-4 py-3">
              <div className="w-14 h-10 rounded-lg overflow-hidden flex-shrink-0"
                style={{ background: "#F4F6F5" }}>
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg">🏠</div>
                )}
              </div>
            </td>
            <td className="px-4 py-3 text-xs" style={{ color: "#9DB8AD" }}>
              {b.reference ?? "—"}
            </td>
            <td className="px-4 py-3 text-sm max-w-xs">
              <div className="truncate font-medium" style={{ color: "#3D4A42" }}>{b.titre}</div>
              <div className="text-xs mt-0.5" style={{ color: "#9DB8AD" }}>
                {b.quartier ? `${b.quartier}, ` : ""}{b.ville}
              </div>
            </td>
            <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: "#6B7A71" }}>
              {b.type}
            </td>
            <td className="px-4 py-3 text-sm font-medium whitespace-nowrap" style={{ color: "#0F4C3A" }}>
              {formaterPrix(b.prix, b.transaction)}
            </td>
            <td className="px-4 py-3 text-sm" style={{ color: "#6B7A71" }}>{b.ville}</td>
            <td className="px-4 py-3">
              <span
                className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                style={
                  b.verifie
                    ? { background: "#D1FAE5", color: "#065F46" }
                    : { background: "#FEF3C7", color: "#92400E" }
                }
              >
                {b.verifie ? "Vérifié" : "En attente"}
              </span>
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Modifier */}
                <Link
                  href={`/admin/biens/${b.id}`}
                  className="text-xs px-3 py-1 rounded-lg font-medium"
                  style={{ background: "#E8F5ED", color: "#0F4C3A", border: "1px solid #C6E8D4" }}
                >
                  Modifier
                </Link>
                {/* Vérifier / Dévérifier via form + Server Action */}
                {b.verifie ? (
                  <form action={deverifierBien.bind(null, b.id)}>
                    <button
                      type="submit"
                      className="text-xs px-3 py-1 rounded-lg font-medium cursor-pointer"
                      style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}
                    >
                      Dévérifier
                    </button>
                  </form>
                ) : (
                  <form action={verifierBien.bind(null, b.id)}>
                    <button
                      type="submit"
                      className="text-xs px-3 py-1 rounded-lg font-medium cursor-pointer"
                      style={{ background: "#D1FAE5", color: "#065F46", border: "1px solid #6EE7B7" }}
                    >
                      Vérifier
                    </button>
                  </form>
                )}
                <BoutonSupprimer id={b.id} titre={b.titre} />
              </div>
            </td>
          </tr>
          );
        })}
      </TableauAdmin>
    </div>
  );
}
