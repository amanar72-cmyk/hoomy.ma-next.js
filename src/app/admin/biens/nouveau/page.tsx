import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import FormulaireCreationBien from "@/components/admin/FormulaireCreationBien";

type SearchParams = Promise<{ vendeur?: string }>;

export default async function PageNouveauBien({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Répertoire propriétaires (RLS is_admin) + pré-sélection depuis une fiche
  // (« Ajouter un bien » → ?vendeur=<id>). Id inconnu → simplement ignoré.
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: proprietaires } = await supabase
    .from("proprietaires")
    .select("id, nom, prenom, telephone")
    .order("nom");
  const vendeurInitial =
    sp.vendeur && (proprietaires ?? []).some((p) => p.id === sp.vendeur)
      ? sp.vendeur
      : null;

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/admin/biens"
          className="text-sm hover:underline"
          style={{ color: "#9DB8AD", textDecoration: "none" }}>
          ← Biens
        </Link>
        <span style={{ color: "#E0DAC8" }}>/</span>
        <span className="text-sm" style={{ color: "#0F4C3A" }}>Nouveau bien</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl mb-1"
          style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}>
          Créer un bien
        </h1>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>
          Remplissez les informations ci-dessous. Vous pouvez enregistrer en brouillon ou proposer directement aux agents.
        </p>
      </div>

      <FormulaireCreationBien
        proprietaires={proprietaires ?? []}
        vendeurInitial={vendeurInitial}
      />
    </div>
  );
}
