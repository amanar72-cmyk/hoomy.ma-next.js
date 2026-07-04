import type { Metadata } from "next";
import Navbar from "@/components/home/Navbar";
import WizardEstimation from "@/components/estimer/WizardEstimation";
import ParcoursVendeur from "@/components/home/ParcoursVendeur";
import ApparitionScroll from "@/components/ui/ApparitionScroll";

export const metadata: Metadata = {
  title: "Estimer mon bien | HOOMY.MA",
  description:
    "Obtenez gratuitement une estimation de la valeur de votre bien immobilier au Maroc basée sur les prix réels du marché.",
};

export default function PageEstimer() {
  return (
    <main style={{ background: "var(--fond-principal)", minHeight: "100vh" }}>
      <Navbar />
      <WizardEstimation />
      {/* Parcours vendeur — relocalisé depuis l'accueil : contexte pertinent
          après une estimation (« et ensuite ? »). */}
      <ApparitionScroll>
        <ParcoursVendeur />
      </ApparitionScroll>
    </main>
  );
}
