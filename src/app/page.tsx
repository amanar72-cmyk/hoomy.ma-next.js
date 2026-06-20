import { supabase } from "@/lib/supabase";
import Navbar from "@/components/home/Navbar";
import HeroSection from "@/components/home/HeroSection";
import BiensVedette from "@/components/home/BiensVedette";
import SectionVilles from "@/components/home/SectionVilles";
import PourquoiHoomy from "@/components/home/PourquoiHoomy";
import Footer from "@/components/home/Footer";
import { SeparateurZellige } from "@/components/ui/MotifZellige";
import type { Bien } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Accueil() {
  const { data } = await supabase
    .from("biens")
    .select("*")
    .order("cree_le", { ascending: false })
    .limit(6);

  const biens = (data ?? []) as Bien[];

  return (
    <main style={{ background: "var(--fond-principal)", minHeight: "100vh" }}>
      <Navbar />
      <HeroSection />
      <BiensVedette biens={biens} />
      <SeparateurZellige className="max-w-6xl mx-auto px-6 py-4" />
      <SectionVilles />
      <PourquoiHoomy />
      <Footer />
    </main>
  );
}
