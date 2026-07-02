import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import CarteStat from "@/components/admin/CarteStat";
import TableauAdmin from "@/components/admin/TableauAdmin";
import { formaterPrix } from "@/lib/format";


export default async function PageAdminDashboard() {
  const supabase = await createClient();

  // Toutes les requêtes en parallèle
  const [
    { count: totalBiens },
    { count: biensVerifies },
    { count: biensNonVerifies },
    { count: totalUtilisateurs },
    { count: biensVente },
    { count: biensLocation },
    { data: derniersBiens },
    { data: derniersUtilisateurs },
    { data: parVille },
  ] = await Promise.all([
    supabase.from("biens").select("*", { count: "exact", head: true }),
    supabase.from("biens").select("*", { count: "exact", head: true }).eq("verifie", true),
    supabase.from("biens").select("*", { count: "exact", head: true }).eq("verifie", false),
    supabase.from("profils").select("*", { count: "exact", head: true }),
    supabase.from("biens").select("*", { count: "exact", head: true }).eq("transaction", "vente"),
    supabase.from("biens").select("*", { count: "exact", head: true }).eq("transaction", "location"),
    supabase
      .from("biens")
      .select("id, titre, type, transaction, prix, ville, verifie, photos, cree_le")
      .order("cree_le", { ascending: false })
      .limit(10),
    supabase
      .from("profils")
      .select("id, nom_complet, role, cree_le")
      .order("cree_le", { ascending: false })
      .limit(10),
    supabase
      .from("biens")
      .select("ville")
      .limit(1000),
  ]);

  // Calcul répartition par ville côté serveur
  const compteVille: Record<string, number> = {};
  (parVille ?? []).forEach((b: { ville: string }) => {
    compteVille[b.ville] = (compteVille[b.ville] ?? 0) + 1;
  });
  const villesTriees = Object.entries(compteVille)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1
          className="text-2xl mb-1"
          style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}
        >
          Tableau de bord
        </h1>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>
          Vue d'ensemble de la plateforme HOOMY.MA
        </p>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <CarteStat icone="🏠" titre="Total biens" valeur={totalBiens ?? 0} />
        <CarteStat
          icone="✅"
          titre="Biens vérifiés"
          valeur={biensVerifies ?? 0}
          couleurAccent="#146C43"
          sousTitre={`${biensNonVerifies ?? 0} en attente`}
        />
        <CarteStat
          icone="👥"
          titre="Utilisateurs"
          valeur={totalUtilisateurs ?? 0}
          couleurAccent="#1a5276"
        />
        <CarteStat
          icone="💰"
          titre="Vente / Location"
          valeur={`${biensVente ?? 0} / ${biensLocation ?? 0}`}
          couleurAccent="#D4AF37"
        />
      </div>

      {/* Répartition par ville */}
      <div className="mb-8">
        <h2 className="text-base font-semibold mb-3" style={{ color: "#0F4C3A" }}>
          Répartition par ville
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {villesTriees.map(([ville, nb]) => (
            <div
              key={ville}
              className="rounded-xl p-4 flex items-center justify-between"
              style={{ background: "#fff", border: "1px solid #E8E2D2" }}
            >
              <span className="text-sm font-medium" style={{ color: "#3D4A42" }}>{ville}</span>
              <span
                className="text-sm font-bold px-2.5 py-0.5 rounded-full"
                style={{ background: "#E8F5ED", color: "#0F4C3A" }}
              >
                {nb}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Derniers biens */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold" style={{ color: "#0F4C3A" }}>
            Derniers biens ajoutés
          </h2>
          <Link
            href="/admin/biens"
            className="text-xs font-medium hover:underline"
            style={{ color: "#146C43" }}
          >
            Voir tout →
          </Link>
        </div>
        <TableauAdmin
          colonnes={["Photo", "Titre", "Type", "Transaction", "Prix", "Ville", "Vérifié"]}
          estVide={(derniersBiens ?? []).length === 0}
          vide="Aucun bien pour l'instant"
        >
          {(derniersBiens ?? []).map((b) => {
            const photo = Array.isArray(b.photos) && b.photos.length > 0 ? b.photos[0] : null;
            return (
            <tr key={b.id} style={{ borderBottom: "1px solid #F0EDE5" }}>
              <td className="px-4 py-3">
                <div className="w-12 h-9 rounded-lg overflow-hidden flex-shrink-0"
                  style={{ background: "#F4F6F5" }}>
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-base">🏠</div>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-sm max-w-xs">
                <Link href={`/admin/biens/${b.id}`}
                  className="font-medium truncate block hover:underline"
                  style={{ color: "#3D4A42", textDecoration: "none" }}>
                  {b.titre}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm" style={{ color: "#6B7A71" }}>{b.type}</td>
              <td className="px-4 py-3 text-sm capitalize" style={{ color: "#6B7A71" }}>
                {b.transaction}
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
            </tr>
            );
          })}
        </TableauAdmin>
      </div>

      {/* Derniers utilisateurs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold" style={{ color: "#0F4C3A" }}>
            Derniers inscrits
          </h2>
          <Link
            href="/admin/utilisateurs"
            className="text-xs font-medium hover:underline"
            style={{ color: "#146C43" }}
          >
            Voir tout →
          </Link>
        </div>
        <TableauAdmin
          colonnes={["Nom", "Rôle", "Inscrit le"]}
          estVide={(derniersUtilisateurs ?? []).length === 0}
          vide="Aucun utilisateur"
        >
          {(derniersUtilisateurs ?? []).map((u) => (
            <tr key={u.id} style={{ borderBottom: "1px solid #F0EDE5" }}>
              <td className="px-4 py-3 text-sm" style={{ color: "#3D4A42" }}>
                {u.nom_complet ?? "—"}
              </td>
              <td className="px-4 py-3">
                <span
                  className="text-xs px-2.5 py-0.5 rounded-full font-medium capitalize"
                  style={{ background: "#E8F5ED", color: "#0F4C3A" }}
                >
                  {u.role ?? "acheteur"}
                </span>
              </td>
              <td className="px-4 py-3 text-sm" style={{ color: "#9DB8AD" }}>
                {new Date(u.cree_le).toLocaleDateString("fr-MA")}
              </td>
            </tr>
          ))}
        </TableauAdmin>
      </div>
    </div>
  );
}
