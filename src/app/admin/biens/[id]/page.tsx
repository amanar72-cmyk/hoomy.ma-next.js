import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import FormulaireEditionBien from "@/components/admin/FormulaireEditionBien";

type Props = { params: Promise<{ id: string }> };

export default async function PageEditionBien({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: bien, error } = await supabase
    .from("biens")
    .select(
      "id, reference, titre, description, type, transaction, prix, ville, quartier, chambres, salles_bain, surface, equipements, photos, verifie, statut"
    )
    .eq("id", id)
    .single();

  if (error || !bien) notFound();

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/admin/biens"
          className="text-sm hover:underline flex items-center gap-1"
          style={{ color: "#9DB8AD", textDecoration: "none" }}>
          ← Biens
        </Link>
        <span style={{ color: "#E0DAC8" }}>/</span>
        <span className="text-sm" style={{ color: "#0F4C3A" }}>
          {bien.reference ?? bien.id.slice(0, 8)}
        </span>
      </div>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl mb-1"
            style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}>
            Modifier le bien
          </h1>
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            {bien.titre}
          </p>
        </div>
        {bien.reference && (
          <span className="text-xs px-3 py-1 rounded-full font-mono mt-1 flex-shrink-0"
            style={{ background: "#E8F5ED", color: "#0F4C3A", border: "1px solid #C6E8D4" }}>
            {bien.reference}
          </span>
        )}
      </div>

      <FormulaireEditionBien bien={bien} />
    </div>
  );
}
