import { createClient } from "@/lib/supabase/server";
import TableauAdmin from "@/components/admin/TableauAdmin";
import SelectRole from "@/components/admin/SelectRole";

type SearchParams = Promise<{ q?: string; role?: string }>;

export default async function PageAdminUtilisateurs({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("profils")
    .select("id, nom_complet, telephone, role, avatar_url, cree_le", { count: "exact" })
    .order("cree_le", { ascending: false });

  if (sp.q) query = query.ilike("nom_complet", `%${sp.q}%`);
  if (sp.role) query = query.eq("role", sp.role);

  const { data: utilisateurs, count } = await query.limit(100);

  const ROLES = ["acheteur", "vendeur", "agent", "agence", "admin"];

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1
          className="text-2xl mb-1"
          style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}
        >
          Gestion des utilisateurs
        </h1>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>
          {count ?? 0} utilisateur{(count ?? 0) > 1 ? "s" : ""} inscrit{(count ?? 0) > 1 ? "s" : ""}
        </p>
      </div>

      {/* Filtres */}
      <form method="get" className="flex flex-wrap gap-3 mb-6">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Rechercher par nom…"
          className="border rounded-xl px-4 py-2 text-sm"
          style={{ borderColor: "#E0DAC8", color: "#0F4C3A", minWidth: 200 }}
        />

        <select
          name="role"
          defaultValue={sp.role ?? ""}
          className="border rounded-xl px-4 py-2 text-sm"
          style={{ borderColor: "#E0DAC8", color: "#0F4C3A" }}
        >
          <option value="">Tous les rôles</option>
          {ROLES.map((r) => (
            <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>
          ))}
        </select>

        <button
          type="submit"
          className="px-5 py-2 rounded-xl text-sm font-medium cursor-pointer"
          style={{ background: "#0F4C3A", color: "#fff" }}
        >
          Filtrer
        </button>
      </form>

      <TableauAdmin
        colonnes={["Utilisateur", "Téléphone", "Rôle", "Inscrit le"]}
        estVide={(utilisateurs ?? []).length === 0}
        vide="Aucun utilisateur trouvé"
      >
        {(utilisateurs ?? []).map((u) => (
          <tr key={u.id} style={{ borderBottom: "1px solid #F0EDE5" }}>
            <td className="px-4 py-3">
              <div className="flex items-center gap-3">
                {u.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: "#E8F5ED", color: "#0F4C3A" }}
                  >
                    {(u.nom_complet ?? "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium" style={{ color: "#3D4A42" }}>
                  {u.nom_complet ?? "—"}
                </span>
              </div>
            </td>
            <td className="px-4 py-3 text-sm" style={{ color: "#6B7A71" }}>
              {u.telephone ?? "—"}
            </td>
            <td className="px-4 py-3">
              <SelectRole id={u.id} roleActuel={u.role ?? "acheteur"} />
            </td>
            <td className="px-4 py-3 text-sm" style={{ color: "#9DB8AD" }}>
              {new Date(u.cree_le).toLocaleDateString("fr-MA")}
            </td>
          </tr>
        ))}
      </TableauAdmin>
    </div>
  );
}
