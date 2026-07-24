import { supabase } from "@/lib/supabase";
import { estVilleActive } from "@/lib/villes";
import type { DemandePublique } from "@/lib/demandes/types";
import VitrineDemandesAnimee from "./VitrineDemandesAnimee";

// Vitrine homepage de la place de marché inversée (/demandes). Server
// Component : lit uniquement la vue anonymisée demandes_publiques (jamais
// de donnée de contact) et transmet à la partie animée/interactive.

export default async function SectionDemandes() {
  const [{ count }, { data }] = await Promise.all([
    supabase.from("demandes_publiques").select("id", { count: "exact", head: true }),
    supabase.from("demandes_publiques").select("*").order("publiee_le", { ascending: false }).limit(6),
  ]);

  const demandes = ((data ?? []) as DemandePublique[]).filter((d) => estVilleActive(d.ville));

  return <VitrineDemandesAnimee nbDemandes={count ?? 0} demandes={demandes} />;
}
