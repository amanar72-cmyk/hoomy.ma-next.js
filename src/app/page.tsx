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
import SectionVendeurs from "@/components/home/SectionVendeurs";
import { Reveal } from "@/components/ui/Reveal";
import { COLONNES_BIEN_PUBLIC, type BienPublic } from "@/lib/types";

export const dynamic = "force-dynamic";

const VILLES_COMPTAGE = ["Casablanca", "Marrakech", "Rabat", "Tanger", "Agadir", "Fès"];

export default async function Accueil() {
  // Trois requêtes en parallèle : biens vedette + comptes par ville + total vérifié
  const [{ data: dataBiens }, { data: dataVilles }, { count: nbBiensVerifies }] = await Promise.all([
    supabase
      .from("biens")
      .select(COLONNES_BIEN_PUBLIC) // jamais latitude/longitude côté public
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
      .eq("verifie", true),
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
        <SectionVendeurs />
      </Reveal>
      <Reveal>
        <SectionLead />
      </Reveal>
      <Footer />
    </main>
  );
}
