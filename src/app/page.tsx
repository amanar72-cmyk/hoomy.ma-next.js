import { supabase } from "@/lib/supabase";
import Navbar from "@/components/home/Navbar";
import HeroSection from "@/components/home/HeroSection";
import BiensVedette from "@/components/home/BiensVedette";
import SectionVilles from "@/components/home/SectionVilles";
import PourquoiHoomy from "@/components/home/PourquoiHoomy";
import ParcoursVendeur from "@/components/home/ParcoursVendeur";
import Footer from "@/components/home/Footer";
import { SeparateurZellige } from "@/components/ui/MotifZellige";
import ApparitionScroll from "@/components/ui/ApparitionScroll";
import SectionLead from "@/components/home/SectionLead";
import { COLONNES_BIEN_PUBLIC, type BienPublic } from "@/lib/types";

export const dynamic = "force-dynamic";

const VILLES_COMPTAGE = ["Casablanca", "Marrakech", "Rabat", "Tanger", "Agadir", "Fès"];

export default async function Accueil() {
  // Deux requêtes en parallèle : biens vedette + comptes par ville
  const [{ data: dataBiens }, { data: dataVilles }] = await Promise.all([
    supabase
      .from("biens")
      .select(COLONNES_BIEN_PUBLIC) // jamais latitude/longitude côté public
      .order("cree_le", { ascending: false })
      .limit(10),
    supabase
      .from("biens")
      .select("ville")
      .in("ville", VILLES_COMPTAGE),
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
      <HeroSection />
      {/* Apparitions discrètes au scroll — hero exclu (LCP) */}
      <ApparitionScroll>
        <ParcoursVendeur />
      </ApparitionScroll>
      <ApparitionScroll>
        <PourquoiHoomy />
      </ApparitionScroll>
      <ApparitionScroll>
        <BiensVedette biens={biens} />
      </ApparitionScroll>
      <SeparateurZellige className="max-w-6xl mx-auto px-6 py-4" />
      <ApparitionScroll>
        <SectionVilles comptesParVille={comptesParVille} />
      </ApparitionScroll>
      <ApparitionScroll>
        <SectionLead />
      </ApparitionScroll>
      <Footer />
    </main>
  );
}
