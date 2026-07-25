import { supabase } from "@/lib/supabase";
import type { Metadata } from "next";
import AccueilImmersif from "@/components/accueil/AccueilImmersif";
import { FILTRE_VILLES_ACTIVES_OR } from "@/lib/villes";
import { COLONNES_BIEN_PUBLIC, type BienPublic } from "@/lib/types";

// APERÇU uniquement — direction artistique « Immersif 3D » en test.
// N'est PAS la page d'accueil (src/app/page.tsx reste inchangée) et n'est
// pas indexable : c'est une maquette à valider avant toute bascule.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aperçu — direction immersive | HOOMY.MA",
  robots: { index: false, follow: false },
};

export default async function PageApercuImmersif() {
  // Biens réels (jamais de données fictives), villes actives uniquement
  const { data } = await supabase
    .from("biens")
    .select(COLONNES_BIEN_PUBLIC) // jamais latitude/longitude côté public
    .or(FILTRE_VILLES_ACTIVES_OR)
    .order("cree_le", { ascending: false })
    .limit(3);

  const biens = (data ?? []) as unknown as BienPublic[];

  return <AccueilImmersif biens={biens} />;
}
