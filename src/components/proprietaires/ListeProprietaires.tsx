import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TableauAdmin from "@/components/admin/TableauAdmin";

// Répertoire des propriétaires (vendeurs) — Server Component PARTAGÉ entre
// /admin/proprietaires et /pro/proprietaires (seul `base` change).
// Répertoire commun à toute l'équipe : la RLS (is_admin/est_pro) fait foi.

type Props = {
  base: "/admin" | "/pro";
  q?: string;
};

export default async function ListeProprietaires({ base, q }: Props) {
  const supabase = await createClient();

  let query = supabase
    .from("proprietaires")
    .select("id, nom, prenom, telephone, email, cree_le", { count: "exact" })
    .order("cree_le", { ascending: false });

  if (q) {
    // Recherche nom / prénom / téléphone (chiffres tels que saisis)
    const motif = `%${q.trim()}%`;
    query = query.or(
      `nom.ilike.${motif},prenom.ilike.${motif},telephone.ilike.${motif}`
    );
  }

  const { data: proprietaires, count, error } = await query.limit(200);

  // Nombre de biens rattachés par propriétaire (via vendeur_id)
  const ids = (proprietaires ?? []).map((p) => p.id);
  const biensParProprietaire: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: biens } = await supabase
      .from("biens")
      .select("vendeur_id")
      .in("vendeur_id", ids);
    (biens ?? []).forEach((b) => {
      const vid = b.vendeur_id as string;
      biensParProprietaire[vid] = (biensParProprietaire[vid] ?? 0) + 1;
    });
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl mb-1"
            style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}
          >
            Propriétaires
          </h1>
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            {count ?? 0} propriétaire{(count ?? 0) > 1 ? "s" : ""} (vendeurs) — répertoire
            partagé de l&apos;équipe
          </p>
        </div>
        <Link
          href={`${base}/proprietaires/nouveau`}
          className="px-5 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: "#D4AF37", color: "#0F4C3A" }}
        >
          + Nouveau propriétaire
        </Link>
      </div>

      <form method="get" className="flex flex-wrap gap-3 mb-6">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Rechercher par nom ou téléphone…"
          className="border rounded-xl px-4 py-2 text-sm"
          style={{ borderColor: "#E0DAC8", color: "#0F4C3A", minWidth: 260 }}
        />
        <button
          type="submit"
          className="px-5 py-2 rounded-xl text-sm font-medium cursor-pointer"
          style={{ background: "#0F4C3A", color: "#fff" }}
        >
          Rechercher
        </button>
      </form>

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm mb-6"
          style={{ background: "#FDF3F2", color: "#B3412F", border: "1px solid #F2D6D1" }}
        >
          Chargement du répertoire impossible : {error.message}
        </div>
      )}

      <TableauAdmin
        colonnes={["Propriétaire", "Téléphone", "Email", "Biens", "Créé le"]}
        estVide={(proprietaires ?? []).length === 0}
        vide={q ? "Aucun propriétaire ne correspond à cette recherche" : "Aucun propriétaire — créez le premier"}
      >
        {(proprietaires ?? []).map((p) => {
          const nb = biensParProprietaire[p.id] ?? 0;
          const nomComplet = [p.prenom, p.nom].filter(Boolean).join(" ");
          return (
            <tr key={p.id} style={{ borderBottom: "1px solid #F0EDE5" }}>
              <td className="px-4 py-3">
                <Link href={`${base}/proprietaires/${p.id}`} className="flex items-center gap-3 group">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: "#E8F5ED", color: "#0F4C3A" }}
                  >
                    {(p.nom ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <span
                    className="text-sm font-medium group-hover:underline"
                    style={{ color: "#3D4A42" }}
                  >
                    {nomComplet || "—"}
                  </span>
                </Link>
              </td>
              <td className="px-4 py-3 text-sm" style={{ color: "#6B7A71" }}>
                {p.telephone}
              </td>
              <td className="px-4 py-3 text-sm" style={{ color: "#6B7A71" }}>
                {p.email ?? "—"}
              </td>
              <td
                className="px-4 py-3 text-sm font-medium text-center"
                style={{ color: nb > 0 ? "#0F4C3A" : "#9DB8AD" }}
              >
                {nb}
              </td>
              <td className="px-4 py-3 text-sm" style={{ color: "#9DB8AD" }}>
                {new Date(p.cree_le).toLocaleDateString("fr-MA")}
              </td>
            </tr>
          );
        })}
      </TableauAdmin>
    </div>
  );
}
