import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import FormulaireProposerBien from "@/components/demandes/FormulaireProposerBien";
import type { DemandePublique } from "@/lib/demandes/types";
import { LIBELLE_TRANSACTION, formaterFourchetteBudget } from "@/lib/demandes/types";

type Props = { params: Promise<{ reference: string }> };

async function chargerDemande(reference: string): Promise<DemandePublique | null> {
  const { data } = await supabase
    .from("demandes_publiques")
    .select("*")
    .eq("reference", reference.toUpperCase())
    .maybeSingle();
  return (data as DemandePublique | null) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { reference } = await params;
  const demande = await chargerDemande(reference);
  if (!demande) return { title: "Demande introuvable" };
  return {
    title: `${demande.type_bien ?? "Bien"} recherché à ${demande.ville} — ${demande.reference} | HOOMY.MA`,
    description: `Un client recherche ${demande.type_bien ?? "un bien"} à ${demande.ville}${demande.quartiers?.length ? ` (${demande.quartiers.join(", ")})` : ""}. Proposez votre bien.`,
    alternates: { canonical: `/demandes/${demande.reference}` },
  };
}

export default async function PageDemandeDetail({ params }: Props) {
  const { reference } = await params;
  const demande = await chargerDemande(reference);
  if (!demande) notFound();

  const budget = formaterFourchetteBudget(demande.budget_min, demande.budget_max);

  const lignes: { label: string; valeur: string }[] = [
    { label: "Transaction", valeur: LIBELLE_TRANSACTION[demande.transaction] },
    { label: "Type de bien", valeur: demande.type_bien ?? "Non précisé" },
    { label: "Ville", valeur: demande.ville },
    ...(demande.quartiers?.length ? [{ label: "Quartiers souhaités", valeur: demande.quartiers.join(", ") }] : []),
    ...(budget ? [{ label: "Budget", valeur: budget }] : []),
    ...(demande.surface_min ? [{ label: "Surface minimale", valeur: `${demande.surface_min} m²` }] : []),
    ...(demande.chambres_min ? [{ label: "Chambres minimum", valeur: `${demande.chambres_min}` }] : []),
    ...(demande.urgence ? [{ label: "Urgence", valeur: demande.urgence }] : []),
    ...(demande.criteres_supplementaires ? [{ label: "Critères supplémentaires", valeur: demande.criteres_supplementaires }] : []),
  ];

  return (
    <main style={{ background: "var(--fond-principal)", minHeight: "100vh" }}>
      <Navbar />

      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link href="/demandes" className="text-sm hover:underline" style={{ color: "var(--texte-tertiaire)", textDecoration: "none" }}>
          ← Toutes les demandes
        </Link>

        <div className="mt-4 mb-6 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-mono px-2.5 py-1 rounded-full" style={{ background: "var(--fond-accent)", color: "var(--texte-secondaire)" }}>
            {demande.reference}
          </span>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={demande.transaction === "location" ? { background: "var(--accent)", color: "var(--texte-sur-accent)" } : { background: "var(--primaire)", color: "var(--fond-secondaire)" }}
          >
            {LIBELLE_TRANSACTION[demande.transaction]}
          </span>
        </div>

        <h1 className="text-2xl md:text-3xl mb-6" style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--texte-principal)" }}>
          {demande.type_bien ?? "Bien"} recherché à {demande.ville}
        </h1>

        <div className="rounded-2xl p-6 mb-6" style={{ background: "var(--fond-secondaire)", border: "1px solid var(--bordure)" }}>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {lignes.map((l) => (
              <div key={l.label}>
                <dt className="text-xs mb-0.5" style={{ color: "var(--texte-tertiaire)" }}>{l.label}</dt>
                <dd className="text-sm font-medium" style={{ color: "var(--texte-principal)" }}>{l.valeur}</dd>
              </div>
            ))}
          </dl>
          {demande.description && (
            <div className="mt-5 pt-5" style={{ borderTop: "1px solid var(--bordure-legere)" }}>
              <p className="text-xs mb-1" style={{ color: "var(--texte-tertiaire)" }}>Description</p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--texte-corps)" }}>{demande.description}</p>
            </div>
          )}
        </div>

        <FormulaireProposerBien demandeId={demande.id} reference={demande.reference} />
      </div>

      <Footer />
    </main>
  );
}
