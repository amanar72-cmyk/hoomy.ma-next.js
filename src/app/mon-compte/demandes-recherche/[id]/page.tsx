import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import FormulaireDemandeRecherche from "@/components/demandes/FormulaireDemandeRecherche";
import type { DemandeRecherche } from "@/lib/demandes/types";

export const metadata: Metadata = { title: "Modifier ma demande — Mon espace HOOMY.MA" };

type Props = { params: Promise<{ id: string }> };

export default async function PageModifierDemandeRecherche({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=/mon-compte/demandes-recherche/${id}`);

  const { data } = await supabase
    .from("demandes_recherche")
    .select("*")
    .eq("id", id)
    .eq("demandeur_id", user.id) // ceinture + bretelles, la RLS le garantit déjà
    .maybeSingle();

  if (!data) notFound();
  const demande = data as DemandeRecherche;

  if (demande.statut === "publiee" || demande.statut === "pourvue" || demande.statut === "archivee") {
    redirect("/mon-compte/demandes-recherche");
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/mon-compte/demandes-recherche" className="text-sm hover:underline" style={{ color: "#9DB8AD", textDecoration: "none" }}>
        ← Ma recherche publiée
      </Link>
      <h1 className="text-xl font-normal mt-3 mb-6" style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
        Modifier ma demande — {demande.reference}
      </h1>
      <FormulaireDemandeRecherche
        initial={{
          id: demande.id,
          nom: demande.nom,
          prenom: demande.prenom,
          telephone: demande.telephone,
          email: demande.email,
          profilDemandeur: demande.profil_demandeur,
          transaction: demande.transaction,
          typeBien: demande.type_bien,
          ville: demande.ville,
          quartiers: demande.quartiers ?? [],
          budgetMin: demande.budget_min,
          budgetMax: demande.budget_max,
          surfaceMin: demande.surface_min,
          chambresMin: demande.chambres_min,
          criteresSupplementaires: demande.criteres_supplementaires,
          urgence: demande.urgence,
          description: demande.description,
        }}
      />
    </div>
  );
}
