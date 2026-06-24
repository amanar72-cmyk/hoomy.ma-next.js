import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import TableauAdmin from "@/components/admin/TableauAdmin";
import LigneBienAdmin from "@/components/admin/LigneBienAdmin";
import { verifierBien, deverifierBien } from "@/app/admin/actions";

type SearchParams = Promise<{
  ville?: string;
  type?: string;
  verifie?: string;
  q?: string;
}>;

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
            photos={Array.isArray(b.photos) ? b.photos : null}
            verifierFn={verifierBien.bind(null, b.id)}
            deverifierFn={deverifierBien.bind(null, b.id)}
          />
        ))}
      </TableauAdmin>
    </div>
  );
}
