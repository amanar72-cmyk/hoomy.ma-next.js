import Navbar from "@/components/home/Navbar";
import FormulaireInscription from "@/components/auth/FormulaireInscription";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inscription",
  // Page d'inscription : aucune valeur d'indexation, et une page de ce type dans les
  // résultats de recherche n'apporte rien au visiteur.
  robots: { index: false, follow: false },
};

export default function PageInscription() {
  return (
    <>
      <Navbar />
      <FormulaireInscription />
    </>
  );
}
