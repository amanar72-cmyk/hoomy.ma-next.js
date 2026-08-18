import { headers } from "next/headers";
import Navbar from "@/components/home/Navbar";
import FormulaireConnexion from "@/components/auth/FormulaireConnexion";
import FormulaireConnexionPro from "@/components/auth/FormulaireConnexionPro";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Connexion",
  // Page de connexion : aucune valeur d'indexation, et une page de ce type dans les
  // résultats de recherche n'apporte rien au visiteur.
  robots: { index: false, follow: false },
};

// Premier écran de l'application iOS : c'est ici qu'atterrit un agent non
// connecté. Sans viewport-fit=cover, les variables --pro-safe-* restent à zéro
// et le formulaire remonte sous l'encoche. Déclaré ici plutôt que dans les
// gabarits pro/admin, qui ne couvrent pas cette page (elle est servie à la
// racine du sous-domaine).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function PageConnexion() {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const estPro = host.startsWith("pro.");

  if (estPro) {
    return <FormulaireConnexionPro />;
  }

  return (
    <>
      <Navbar />
      <FormulaireConnexion />
    </>
  );
}
