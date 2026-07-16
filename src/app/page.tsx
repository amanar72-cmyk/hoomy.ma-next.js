import { supabase } from "@/lib/supabase";
import Navbar from "@/components/home/Navbar";
import HeroSection from "@/components/home/HeroSection";
import BiensVedette from "@/components/home/BiensVedette";
import SectionVilles from "@/components/home/SectionVilles";
import PourquoiHoomy from "@/components/home/PourquoiHoomy";
import DoubleParcours from "@/components/home/DoubleParcours";
import Footer from "@/components/home/Footer";
import { SeparateurZellige } from "@/components/ui/MotifZellige";
import ApparitionScroll from "@/components/ui/ApparitionScroll";
import SectionLead from "@/components/home/SectionLead";
import ParcoursProprietaire from "@/components/home/ParcoursProprietaire";
import { Reveal } from "@/components/ui/Reveal";
import { LISTE_VILLES_ACTIVES, FILTRE_VILLES_ACTIVES_OR } from "@/lib/villes";
import { COLONNES_BIEN_PUBLIC, type BienPublic } from "@/lib/types";

export const dynamic = "force-dynamic";

// Diffusion publique : uniquement les villes actives (src/lib/villes.ts)
const VILLES_COMPTAGE = LISTE_VILLES_ACTIVES;

export default async function Accueil() {
  // Trois requêtes en parallèle : biens vedette + comptes par ville + total vérifié
  const [{ data: dataBiens }, { data: dataVilles }, { count: nbBiensVerifies }] = await Promise.all([
    supabase
      .from("biens")
      .select(COLONNES_BIEN_PUBLIC) // jamais latitude/longitude côté public
      .or(FILTRE_VILLES_ACTIVES_OR) // mise en avant limitée aux villes actives
      .order("cree_le", { ascending: false })
      .limit(10),
    supabase
      .from("biens")
      .select("ville")
      .in("ville", VILLES_COMPTAGE),
    // Chiffre RÉEL du bandeau de réassurance du hero (aucune stat inventée)
    supabase
      .from("biens")
      .select("id", { count: "exact", head: true })
      .eq("verifie", true)
      .or(FILTRE_VILLES_ACTIVES_OR),
  ]);

  const biens = (dataBiens ?? []) as unknown as BienPublic[];

  // Agrégation côté serveur — même condition de visibilité que /acheter et /louer
  const comptesParVille: Record<string, number> = {};
  for (const b of dataVilles ?? []) {
    if (b.ville) comptesParVille[b.ville] = (comptesParVille[b.ville] ?? 0) + 1;
  }

  return (
    <main style={{ background: "var(--fond-principal)", minHeight: "100vh" }}>
      <Navbar />
      <HeroSection nbBiensVerifies={nbBiensVerifies ?? 0} />
      {/* Ordre orienté conversion :
          Hero → Biens en vedette → Double parcours → Villes → Pourquoi HOOMY
          → Bloc vendeurs → Contact. Apparitions au scroll — Hero exclu (LCP).
          BiensVedette (proche de la ligne de flottaison) garde ApparitionScroll
          (rendu SSR visible) ; les sections plus bas utilisent Reveal (Framer). */}
      <ApparitionScroll>
        <BiensVedette biens={biens} />
      </ApparitionScroll>
      {/* Parcours propriétaire — anime lui-même ses étapes au scroll (fil d'or) */}
      <ParcoursProprietaire />
      <Reveal>
        <DoubleParcours />
      </Reveal>
      <Reveal>
        <SectionVilles comptesParVille={comptesParVille} />
      </Reveal>
      <SeparateurZellige className="max-w-6xl mx-auto px-6 py-4" />
      <Reveal>
        <PourquoiHoomy />
      </Reveal>
      <Reveal>
        <SectionLead />
      </Reveal>
      <Footer />
    </main>
  );
}
