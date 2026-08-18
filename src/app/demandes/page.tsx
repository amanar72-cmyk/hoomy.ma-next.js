import { supabase } from "@/lib/supabase";
import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { LISTE_VILLES_ACTIVES, LIBELLE_VILLES_ACTIVES, estVilleActive } from "@/lib/villes";
import type { DemandePublique } from "@/lib/demandes/types";
import { LIBELLE_TRANSACTION, formaterFourchetteBudget } from "@/lib/demandes/types";

// Page publique — place de marché inversée : demandes de recherche publiées
// ANONYMEMENT (lecture via la vue demandes_publiques, qui n'expose PHYSIQUEMENT
// aucune donnée de contact — voir demandes_recherche.sql). Indexable (SEO,
// acquisition de propositions), restreinte aux villes actives comme le reste
// du moteur public.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Demandes de recherche — Trouvez un client pour votre bien",
  description: `Des clients recherchent activement un bien à ${LIBELLE_VILLES_ACTIVES}. Consultez leurs critères et proposez le vôtre.`,
  alternates: { canonical: "/demandes" },
};

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function str(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

export default async function PageDemandes({ searchParams }: Props) {
  const sp = await searchParams;
  const transaction = str(sp.transaction);
  const ville = str(sp.ville);
  const type = str(sp.type);
  const budgetMax = str(sp.budgetMax);

  let query = supabase
    .from("demandes_publiques")
    .select("*")
    .order("publiee_le", { ascending: false })
    .limit(60);

  if (transaction === "achat" || transaction === "location") query = query.eq("transaction", transaction);
  if (ville && estVilleActive(ville)) query = query.ilike("ville", ville);
  if (type) query = query.ilike("type_bien", type);
  if (budgetMax) query = query.lte("budget_min", Number(budgetMax));

  const { data, error } = await query;
  // Filet de sécurité applicatif : même si la vue ne restreint pas elle-même
  // aux villes actives, la diffusion publique HOOMY reste alignée partout.
  const demandes = ((data ?? []) as DemandePublique[]).filter((d) => estVilleActive(d.ville));

  return (
    <main style={{ background: "var(--fond-principal)", minHeight: "100vh" }}>
      <Navbar />

      <section className="px-6 py-12 text-center" style={{ background: "linear-gradient(145deg, #0A3528 0%, #0F4C3A 60%, #146C43 100%)" }}>
        <p className="text-xs tracking-widest mb-3" style={{ color: "var(--accent)", letterSpacing: "0.2em" }}>
          PLACE DE MARCHÉ HOOMY
        </p>
        <h1 className="text-3xl md:text-4xl font-normal mb-3" style={{ fontFamily: "var(--font-marcellus), serif", color: "#fff" }}>
          Des clients recherchent un bien
        </h1>
        <p className="text-sm max-w-xl mx-auto leading-relaxed" style={{ color: "#C9D5CF" }}>
          Consultez les critères recherchés à {LIBELLE_VILLES_ACTIVES} et proposez le bien qui correspond —
          vendeurs, bailleurs, agences.
        </p>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* ── Filtres ── */}
        <form method="get" className="flex flex-wrap gap-3 mb-8">
          <select name="transaction" defaultValue={transaction} className="border rounded-xl px-4 py-2 text-sm" style={{ borderColor: "var(--bordure-chaude)", color: "var(--texte-corps)" }}>
            <option value="">Achat ou location</option>
            <option value="achat">Achat</option>
            <option value="location">Location</option>
          </select>
          <select name="ville" defaultValue={ville} className="border rounded-xl px-4 py-2 text-sm" style={{ borderColor: "var(--bordure-chaude)", color: "var(--texte-corps)" }}>
            <option value="">Toutes les villes</option>
            {LISTE_VILLES_ACTIVES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select name="type" defaultValue={type} className="border rounded-xl px-4 py-2 text-sm" style={{ borderColor: "var(--bordure-chaude)", color: "var(--texte-corps)" }}>
            <option value="">Tous types</option>
            {["Appartement", "Maison", "Villa", "Riad", "Bureau", "Local commercial", "Terrain"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input name="budgetMax" defaultValue={budgetMax} type="number" placeholder="Budget max (DH)" className="border rounded-xl px-4 py-2 text-sm w-40" style={{ borderColor: "var(--bordure-chaude)", color: "var(--texte-corps)" }} />
          <button type="submit" className="px-5 py-2 rounded-xl text-sm font-medium cursor-pointer" style={{ background: "var(--primaire)", color: "var(--fond-secondaire)" }}>
            Filtrer
          </button>
        </form>

        {error && (
          <div className="rounded-xl px-5 py-4 mb-6" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
            <p className="text-sm" style={{ color: "#991B1B" }}>Chargement impossible : {error.message}</p>
          </div>
        )}

        <p className="text-sm mb-5" style={{ color: "var(--texte-tertiaire)" }}>
          {demandes.length} demande{demandes.length !== 1 ? "s" : ""} publiée{demandes.length !== 1 ? "s" : ""}
        </p>

        {demandes.length === 0 && !error ? (
          <div className="rounded-2xl py-16 text-center" style={{ background: "var(--fond-secondaire)", border: "1px dashed var(--bordure)" }}>
            <p className="text-sm" style={{ color: "var(--texte-tertiaire)" }}>Aucune demande publiée pour l&apos;instant.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {demandes.map((d) => {
              const budget = formaterFourchetteBudget(d.budget_min, d.budget_max);
              return (
                <Link
                  key={d.id}
                  href={`/demandes/${d.reference}`}
                  className="rounded-2xl p-5 flex flex-col gap-2 transition-all hover:-translate-y-0.5"
                  style={{ background: "var(--fond-secondaire)", border: "1px solid var(--bordure)", textDecoration: "none", boxShadow: "0 2px 12px rgba(15,76,58,0.06)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono" style={{ color: "var(--texte-tertiaire)" }}>{d.reference}</span>
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={d.transaction === "location" ? { background: "var(--accent)", color: "var(--texte-sur-accent)" } : { background: "var(--primaire)", color: "var(--fond-secondaire)" }}
                    >
                      {LIBELLE_TRANSACTION[d.transaction]}
                    </span>
                  </div>
                  <p className="text-base font-semibold" style={{ color: "var(--texte-principal)", fontFamily: "var(--font-marcellus), serif" }}>
                    {d.type_bien ?? "Bien"} — {d.ville}
                  </p>
                  {d.quartiers && d.quartiers.length > 0 && (
                    <p className="text-xs" style={{ color: "var(--texte-secondaire)" }}>{d.quartiers.join(", ")}</p>
                  )}
                  {budget && <p className="text-sm font-medium" style={{ color: "var(--accent-fort)" }}>{budget}</p>}
                  <div className="flex gap-3 text-xs mt-1" style={{ color: "var(--texte-tertiaire)" }}>
                    {d.surface_min && <span>{d.surface_min} m² min.</span>}
                    {d.chambres_min && <span>{d.chambres_min} ch. min.</span>}
                  </div>
                  {d.publiee_le && (
                    <p className="text-xs mt-1" style={{ color: "var(--texte-pale)" }}>
                      Publiée le {new Date(d.publiee_le).toLocaleDateString("fr-MA")}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
