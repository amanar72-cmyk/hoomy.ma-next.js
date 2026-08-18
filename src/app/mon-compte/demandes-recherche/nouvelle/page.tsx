import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import FormulaireDemandeRecherche from "@/components/demandes/FormulaireDemandeRecherche";

export const metadata: Metadata = { title: "Nouvelle demande de recherche — Mon espace" };

export default async function PageNouvelleDemandeRecherche() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/mon-compte/demandes-recherche/nouvelle");

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/mon-compte/demandes-recherche" className="text-sm hover:underline" style={{ color: "#9DB8AD", textDecoration: "none" }}>
        ← Ma recherche publiée
      </Link>
      <h1 className="text-xl font-normal mt-3 mb-6" style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
        Publier ma demande de recherche
      </h1>
      <FormulaireDemandeRecherche />
    </div>
  );
}
