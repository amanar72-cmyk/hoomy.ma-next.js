import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import TableauAdmin from "@/components/admin/TableauAdmin";
import LigneBienAdmin from "@/components/admin/LigneBienAdmin";
import BadgeStatut from "@/components/compte/BadgeStatut";
import { verifierBien, deverifierBien } from "@/app/admin/actions";
import { urlsPhotosNettes } from "@/lib/images/photosBien";

// Statuts "déjà transmis / publiés" — tout le reste est considéré entrant/en cours.
const STATUTS_NON_ENTRANTS = ["en_validation", "finalise", "transacte", "rejete", "suspendu", "archive"];

function formaterPrixBien(prix: number, transaction: string) {
  const m = prix.toLocaleString("fr-MA");
  return transaction === "location" ? `${m} DH/mois` : `${m} DH`;
}

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

  // ── Biens entrants / en cours — fraîchement créés, pas encore transmis au BO ──
  const { data: entrantsRaw } = await supabase
    .from("biens")
    .select("id, reference, titre, type, transaction, prix, ville, quartier, statut, verifie, photos, photos_originales, cree_le")
    .or(`statut.is.null,statut.not.in.(${STATUTS_NON_ENTRANTS.join(",")})`)
    .order("cree_le", { ascending: false })
    .limit(12);

  const biensEntrants = await Promise.all(
    (entrantsRaw ?? []).map(async (b) => ({
      ...b,
      photoNette: (await urlsPhotosNettes(
        Array.isArray(b.photos) ? b.photos : [],
        Array.isArray(b.photos_originales) ? b.photos_originales : [],
        b.verifie
      ))[0] ?? null,
    }))
  );

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

      {/* ── Biens entrants / en cours ─────────────────────────────────────── */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "#111" }}>
          Biens entrants / en cours
          <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: "#F5F5F5", color: "#999" }}>
            {biensEntrants.length}
          </span>
        </h2>
        {biensEntrants.length === 0 ? (
          <div className="rounded-2xl py-8 text-center" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
            <p className="text-sm" style={{ color: "#CCC" }}>Aucun bien entrant pour le moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {biensEntrants.map((b) => (
              <Link
                key={b.id}
                href={`/admin/biens/${b.id}?modifier=1`}
                className="rounded-2xl overflow-hidden flex flex-col transition-shadow hover:shadow-md"
                style={{ background: "#fff", border: "1px solid #EBEBEB", textDecoration: "none" }}
              >
                <div className="h-32 flex items-center justify-center flex-shrink-0" style={{ background: "#F4F6F5" }}>
                  {b.photoNette ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.photoNette} alt={b.titre} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">🏠</span>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-xs" style={{ color: "#CCC" }}>{b.reference ?? "—"}</p>
                    <BadgeStatut statut={b.statut} />
                  </div>
                  <p className="text-sm font-medium leading-snug mb-1" style={{ color: "#111" }}>
                    {b.titre}
                  </p>
                  <p className="text-xs mb-1" style={{ color: "#999" }}>
                    {b.quartier ? `${b.quartier}, ` : ""}{b.ville}
                  </p>
                  <p className="text-sm font-semibold" style={{ color: "#0F4C3A" }}>
                    {formaterPrixBien(b.prix, b.transaction)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
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
