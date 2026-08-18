import type { Metadata } from "next";
import FormulaireMotDePasseOublie from "@/components/auth/FormulaireMotDePasseOublie";

// Page « Mot de passe oublié » — cible du lien depuis /connexion.
// Elle manquait : le lien pointait vers une route inexistante (→ page d'erreur).
export const metadata: Metadata = {
  title: "Mot de passe oublié",
  robots: { index: false, follow: false },
};

export default function PageMotDePasseOublie() {
  return <FormulaireMotDePasseOublie />;
}
