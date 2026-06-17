import { createClient } from "@/lib/supabase/server";
import TableauAdmin from "@/components/admin/TableauAdmin";
import BoutonAction from "@/components/admin/BoutonAction";
import { changerRole } from "@/app/admin/actions";
import Link from "next/link";

type SearchParams = Promise<{ q?: string; role?: string }>;

export default async function PageAdminClients({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("profils")
    .select("id, nom_complet, telephone, role, cree_le", { count: "exact" })
    .in("role", ["acheteur", "vendeur"])
    .order("cree_le", { ascending: false });

  if (sp.q) query = query.ilike("nom_complet", `%${sp.q}%`);
  if (sp.role && ["acheteur", "vendeur"].includes(sp.role)) query = query.eq("role", sp.role);

  const { data: clients, count } = await query.limit(200);

  // Nombre de biens soumis par client (via proprietaire_id)
  const clientIds = (clients ?? []).map((c) => c.id);
  let biensParClient: Record<string, number> = {};
  if (clientIds.length > 0) {
    const { data: biens } = await supabase
      .from("biens")
      .select("proprietaire_id")
      .in("proprietaire_id", clientIds);
    (biens ?? []).forEach((b) => {
      const pid = b.proprietaire_id as string;
      biensParClient[pid] = (biensParClient[pid] ?? 0) + 1;
    });
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl mb-1"
          style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}>
          Clients
        </h1>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>
          {count ?? 0} client{(count ?? 0) > 1 ? "s" : ""} (acheteurs & vendeurs)
        </p>
      </div>

      {/* Filtres */}
      <form method="get" className="flex flex-wrap gap-3 mb-6">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Rechercher par nom…"
          className="border rounded-xl px-4 py-2 text-sm"
          style={{ borderColor: "#E0DAC8", color: "#0F4C3A", minWidth: 220 }} />
        <select name="role" defaultValue={sp.role ?? ""}
          className="border rounded-xl px-4 py-2 text-sm"
          style={{ borderColor: "#E0DAC8", color: "#0F4C3A" }}>
          <option value="">Tous</option>
          <option value="acheteur">Acheteur</option>
          <option value="vendeur">Vendeur</option>
        </select>
        <button type="submit"
          className="px-5 py-2 rounded-xl text-sm font-medium cursor-pointer"
          style={{ background: "#0F4C3A", color: "#fff" }}>
          Filtrer
        </button>
      </form>

      <TableauAdmin
        colonnes={["Client", "Téléphone", "Rôle", "Biens soumis", "Inscrit le", "Actions"]}
        estVide={(clients ?? []).length === 0}
        vide="Aucun client trouvé"
      >
        {(clients ?? []).map((c) => {
          const nbBiens = biensParClient[c.id] ?? 0;
          return (
            <tr key={c.id} style={{ borderBottom: "1px solid #F0EDE5" }}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: "#E8F5ED", color: "#0F4C3A" }}>
                    {(c.nom_complet ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium" style={{ color: "#3D4A42" }}>
                    {c.nom_complet ?? "—"}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm" style={{ color: "#6B7A71" }}>
                {c.telephone ?? "—"}
              </td>
              <td className="px-4 py-3">
                <span className="text-xs px-2.5 py-1 rounded-full capitalize"
                  style={{ background: "#F4F6F5", color: "#6B7A71" }}>
                  {c.role}
                </span>
              </td>
              <td className="px-4 py-3 text-sm font-medium text-center"
                style={{ color: nbBiens > 0 ? "#0F4C3A" : "#9DB8AD" }}>
                {nbBiens > 0 ? (
                  <Link href={`/admin/biens?q=${encodeURIComponent(c.nom_complet ?? "")}`}
                    className="hover:underline">
                    {nbBiens}
                  </Link>
                ) : "0"}
              </td>
              <td className="px-4 py-3 text-sm" style={{ color: "#9DB8AD" }}>
                {new Date(c.cree_le).toLocaleDateString("fr-MA")}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <BoutonAction
                    action={changerRole.bind(null, c.id, "agent")}
                    label="→ Agent"
                    className="text-xs px-2.5 py-1 rounded-lg font-medium"
                    style={{ background: "#D4AF37", color: "#0F4C3A" }}
                    confirmation={`Promouvoir ${c.nom_complet ?? "cet utilisateur"} en agent ?`}
                  />
                  <BoutonAction
                    action={changerRole.bind(null, c.id, c.role === "acheteur" ? "vendeur" : "acheteur")}
                    label={c.role === "acheteur" ? "→ Vendeur" : "→ Acheteur"}
                    className="text-xs px-2.5 py-1 rounded-lg border"
                    style={{ borderColor: "#E0DAC8", color: "#6B7A71" }}
                  />
                </div>
              </td>
            </tr>
          );
        })}
      </TableauAdmin>
    </div>
  );
}
