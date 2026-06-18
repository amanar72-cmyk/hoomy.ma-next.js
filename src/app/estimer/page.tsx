import type { Metadata } from "next";
import Navbar from "@/components/home/Navbar";
import WizardEstimation from "@/components/estimer/WizardEstimation";

export const metadata: Metadata = {
  title: "Estimer mon bien | HOOMY.MA",
  description:
    "Obtenez gratuitement une estimation de la valeur de votre bien immobilier au Maroc basée sur les prix réels du marché.",
};

export default function PageEstimer() {
  return (
    <main style={{ background: "#FAF7F0", minHeight: "100vh" }}>
      <Navbar />
      <WizardEstimation />
    </main>
  );
}
