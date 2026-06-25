import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import TableauAdmin from "@/components/admin/TableauAdmin";
import LigneBienAdmin from "@/components/admin/LigneBienAdmin";
import { verifierBien, deverifierBien } from "@/app/admin/actions";

type SearchParams = Promise<{
  ville?: string;
  type?: string;
  statut?: string;
  q?: string;
}>;

export default async function PageAdminBiens({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("biens")
    .select(
      "id, reference, titre, type, transaction, prix, ville, quartier, verifie, statut, photos, cree_le, agent_id",
      { count: "exact" }
    )
    .order("cree_le", { ascending: false });

  if (sp.ville)  query = query.eq("ville", sp.ville);
  if (sp.type)   query = query.eq("type", sp.type);
  if (sp.statut) query = query.eq("statut", sp.statut);
  if (sp.q)      query = query.ilike("titre", `%${sp.q}%`);

  const { data: biens, count } = await query.limit(50);

  // Résoudre les noms d'agents depuis profils
  const agentIds = [...new Set(
    (biens ?? []).map((b) => b.agent_id as string | null).filter((id): id is string => !!id)
  )];
  let agentMap: Record<string, string> = {};
  if (agentIds.length > 0) {
    const { data: agents } = await supabase
      .from("profils")
      .select("id, nom_complet")
      .in("id", agentIds);
    agentMap = Object.fromEntries((agents ?? []).map((a) => [a.id, a.nom_complet ?? "—"]));
  }

  const VILLES = ["Casablanca", "Marrakech", "Rabat", "Tanger", "Agadir", "Fès"];
  const TYPES  = ["Appartement", "Villa", "Riad", "Bureau", "Terrain"];
  const filtersActifs = !!(sp.q || sp.ville || sp.type || sp.statut);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">

      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold mb-0.5" style={{ color: "#111" }}>
            Gestion des biens
          </h1>
          <p className="text-sm" style={{ color: "#999" }}>
            {count ?? 0} bien{(count ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/biens/nouveau"
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          style={{ background: "#111", color: "#fff", textDecoration: "none" }}
        >
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nouveau bien
        </Link>
      </div>

      {/* Filtres */}
      <form method="get" className="flex flex-wrap gap-2.5 mb-5">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Rechercher par titre…"
          className="border rounded-xl px-4 py-2 text-sm focus:outline-none"
          style={{ borderColor: "#EBEBEB", color: "#111", minWidth: 200, background: "#fff" }}
        />
        <select
          name="ville"
          defaultValue={sp.ville ?? ""}
          className="border rounded-xl px-3 py-2 text-sm"
          style={{ borderColor: "#EBEBEB", color: "#333", background: "#fff" }}
        >
          <option value="">Toutes les villes</option>
          {VILLES.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select
          name="type"
          defaultValue={sp.type ?? ""}
          className="border rounded-xl px-3 py-2 text-sm"
          style={{ borderColor: "#EBEBEB", color: "#333", background: "#fff" }}
        >
          <option value="">Tous les types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          name="statut"
          defaultValue={sp.statut ?? ""}
          className="border rounded-xl px-3 py-2 text-sm"
          style={{ borderColor: "#EBEBEB", color: "#333", background: "#fff" }}
        >
          <option value="">Tous les statuts</option>
          <option value="brouillon">Brouillon</option>
          <option value="affecte">Affecté</option>
          <option value="en_validation">En validation</option>
          <option value="finalise">Publié</option>
          <option value="transacte">Transacté</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity"
          style={{ background: "#111", color: "#fff" }}
        >
          Filtrer
        </button>
        {filtersActifs && (
          <Link
            href="/admin/biens"
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: "#F5F5F5", color: "#777", textDecoration: "none" }}
          >
            Effacer
          </Link>
        )}
      </form>

      <TableauAdmin
        colonnes={["Photo", "Réf.", "Titre", "Statut", "Prix", "Agent", "Actions"]}
        estVide={(biens ?? []).length === 0}
        vide="Aucun bien ne correspond aux filtres"
      >
        {(biens ?? []).map((b) => (
          <LigneBienAdmin
            key={b.id}
            id={b.id}
            reference={b.reference ?? null}
            titre={b.titre}
            type={b.type}
            transaction={b.transaction}
            prix={b.prix}
            ville={b.ville}
            quartier={b.quartier ?? null}
            verifie={b.verifie}
            statut={(b.statut as string | null) ?? null}
            agentNom={(b.agent_id as string | null) ? (agentMap[b.agent_id as string] ?? null) : null}
            photos={Array.isArray(b.photos) ? b.photos : null}
            verifierFn={verifierBien.bind(null, b.id)}
            deverifierFn={deverifierBien.bind(null, b.id)}
          />
        ))}
      </TableauAdmin>
    </div>
  );
}
