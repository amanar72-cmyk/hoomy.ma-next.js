import { createClient } from "@/lib/supabase/server";
import CarteBienPro from "@/components/pro/CarteBienPro";
import CarteVide from "@/components/pro/CarteVide";
import BarreRecherche from "@/components/pro/BarreRecherche";
import Pagination from "@/components/pro/Pagination";
import Link from "next/link";

type SearchParams = Promise<{
  transaction?: string;
  q?: string;
  type?: string;
  ville?: string;
  statut?: string;
  tri?: string;
  page?: string;
}>;

const PAR_PAGE = 12;
const TYPES = ["Appartement", "Villa", "Riad", "Bureau", "Terrain"];
const VILLES = ["Casablanca", "Marrakech", "Rabat", "Tanger", "Agadir", "Fès"];
const TRIS = [
  { value: "", label: "Date (récent)" },
  { value: "prix_asc", label: "Prix croissant" },
  { value: "prix_desc", label: "Prix décroissant" },
  { value: "surface_asc", label: "Surface croissante" },
  { value: "surface_desc", label: "Surface décroissante" },
];

// Statuts disponibles (basés sur verifie — colonne statut à venir)
const STATUTS = [
  { value: "", label: "Tous les statuts" },
  { value: "publie", label: "Publié" },
  { value: "en_traitement", label: "En traitement" },
];

export default async function PageProBiens({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();

  const transaction = sp.transaction ?? "";
  const statut = sp.statut ?? "";
  const tri = sp.tri ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const offset = (page - 1) * PAR_PAGE;

  // Construction de la requête
  let query = supabase
    .from("biens")
    .select("id, reference, slug, titre, type, transaction, prix, ville, quartier, chambres, surface, photos, verifie, cree_le", { count: "exact" });

  if (transaction) query = query.eq("transaction", transaction);
  if (sp.ville) query = query.eq("ville", sp.ville);
  if (sp.type) query = query.eq("type", sp.type);
  if (sp.q) query = query.ilike("titre", `%${sp.q}%`);

  // Filtre statut via verifie (futur: colonne statut dédiée)
  if (statut === "publie") query = query.eq("verifie", true);
  if (statut === "en_traitement") query = query.eq("verifie", false);

  // Tri
  if (tri === "prix_asc") query = query.order("prix", { ascending: true });
  else if (tri === "prix_desc") query = query.order("prix", { ascending: false });
  else if (tri === "surface_asc") query = query.order("surface", { ascending: true });
  else if (tri === "surface_desc") query = query.order("surface", { ascending: false });
  else query = query.order("cree_le", { ascending: false });

  query = query.range(offset, offset + PAR_PAGE - 1);

  const { data: biens, count } = await query;
  const total = count ?? 0;

  // URL de base pour la pagination (sans ?page=)
  const paramsBase = new URLSearchParams();
  if (transaction) paramsBase.set("transaction", transaction);
  if (sp.ville) paramsBase.set("ville", sp.ville);
  if (sp.type) paramsBase.set("type", sp.type);
  if (sp.q) paramsBase.set("q", sp.q);
  if (statut) paramsBase.set("statut", statut);
  if (tri) paramsBase.set("tri", tri);
  const baseUrl = `/pro/biens${paramsBase.toString() ? `?${paramsBase.toString()}` : ""}`;

  const onglets = [
    { label: "Catalogue", value: "" },
    { label: "À vendre", value: "vente" },
    { label: "À louer", value: "location" },
  ];

  const sel = "border rounded-xl px-3 py-2 text-sm focus:outline-none";
  const selStyle = { borderColor: "#E0DAC8", color: "#0F4C3A", background: "#fff" };

  return (
    <div className="max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-normal mb-1"
            style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
            Mes biens
          </h1>
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            {total} bien{total !== 1 ? "s" : ""} · page {page}
          </p>
        </div>
        <button type="button"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
          style={{ background: "#0F4C3A", color: "#fff" }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Ajouter un bien
        </button>
      </div>

      {/* Onglets transaction */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit"
        style={{ background: "#E8E4DA" }}>
        {onglets.map((o) => {
          const actif = transaction === o.value;
          const href = `/pro/biens${o.value ? `?transaction=${o.value}` : ""}`;
          return (
            <Link key={o.value} href={href}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={actif
                ? { background: "#fff", color: "#0F4C3A", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
                : { color: "#6B7A71" }
              }>
              {o.label}
            </Link>
          );
        })}
      </div>

      {/* Filtres */}
      <form method="get" className="flex flex-wrap gap-3 mb-6 items-center">
        {transaction && <input type="hidden" name="transaction" value={transaction} />}

        <BarreRecherche defaultValue={sp.q} placeholder="Titre, référence, ville…" />

        <select name="type" defaultValue={sp.type ?? ""} className={sel} style={selStyle}>
          <option value="">Tous les types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <select name="ville" defaultValue={sp.ville ?? ""} className={sel} style={selStyle}>
          <option value="">Toutes les villes</option>
          {VILLES.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>

        <select name="statut" defaultValue={statut} className={sel} style={selStyle}>
          {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <select name="tri" defaultValue={tri} className={sel} style={selStyle}>
          {TRIS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        <button type="submit"
          className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer"
          style={{ background: "#0F4C3A", color: "#fff" }}>
          Filtrer
        </button>

        {(sp.q || sp.type || sp.ville || statut || tri) && (
          <Link href={`/pro/biens${transaction ? `?transaction=${transaction}` : ""}`}
            className="px-4 py-2 rounded-xl text-sm"
            style={{ background: "#F4F6F5", color: "#6B7A71" }}>
            Effacer
          </Link>
        )}
      </form>

      {/* Grille de biens */}
      {(!biens || biens.length === 0) ? (
        <CarteVide
          message="Aucun bien trouvé"
          sousTitre="Ajustez les filtres ou ajoutez un nouveau bien."
          icone="🏠"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {biens.map((b, i) => (
            <CarteBienPro
              key={b.id}
              id={b.id}
              reference={b.reference}
              titre={b.titre}
              type={b.type}
              transaction={b.transaction}
              prix={b.prix}
              ville={b.ville}
              quartier={b.quartier}
              chambres={b.chambres}
              surface={b.surface}
              photos={b.photos as string[] | null}
              verifie={b.verifie}
              cree_le={b.cree_le}
              vues={Math.floor(Math.random() * 200) + i * 7}
            />
          ))}
        </div>
      )}

      <Pagination page={page} total={total} parPage={PAR_PAGE} baseUrl={baseUrl} />
    </div>
  );
}
