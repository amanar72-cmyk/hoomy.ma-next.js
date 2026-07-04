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
import { COLONNES_BIEN_PUBLIC, type BienPublic } from "@/lib/types";

export const dynamic = "force-dynamic";

const VILLES_COMPTAGE = ["Casablanca", "Marrakech", "Rabat", "Tanger", "Agadir", "Fès"];

export default async function Accueil() {
  // Trois requêtes en parallèle : biens vedette + comptes par ville + zones couvertes
  const [{ data: dataBiens }, { data: dataVilles }, { data: dataQuartiers }] = await Promise.all([
    supabase
      .from("biens")
      .select(COLONNES_BIEN_PUBLIC) // jamais latitude/longitude côté public
      .order("cree_le", { ascending: false })
      .limit(10),
    supabase
      .from("biens")
      .select("ville")
      .in("ville", VILLES_COMPTAGE),
    supabase
      .from("quartiers")
      .select("ville"),
  ]);

  const biens = (dataBiens ?? []) as unknown as BienPublic[];

  // Agrégation côté serveur — même condition de visibilité que /acheter et /louer
  const comptesParVille: Record<string, number> = {};
  for (const b of dataVilles ?? []) {
    if (b.ville) comptesParVille[b.ville] = (comptesParVille[b.ville] ?? 0) + 1;
  }

  // Stats de couverture réelles (compteurs de la section confiance)
  const nbQuartiers = (dataQuartiers ?? []).length;
  const nbVilles = new Set((dataQuartiers ?? []).map((q) => q.ville).filter(Boolean)).size;

  return (
    <main style={{ background: "var(--fond-principal)", minHeight: "100vh" }}>
      <Navbar />
      <HeroSection />
      {/* Ordre : Hero → Double parcours → Biens → Pourquoi → Villes → Lead.
          Apparitions discrètes au scroll — hero exclu (LCP). */}
      <ApparitionScroll>
        <DoubleParcours />
      </ApparitionScroll>
      <ApparitionScroll>
        <BiensVedette biens={biens} />
      </ApparitionScroll>
      <ApparitionScroll>
        <PourquoiHoomy nbQuartiers={nbQuartiers} nbVilles={nbVilles} />
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
