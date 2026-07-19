import type { Metadata } from "next";
import Link from "next/link";
import FormulaireProprietaire from "@/components/proprietaires/FormulaireProprietaire";

export const metadata: Metadata = {
  title: "Nouveau propriétaire | HOOMY PRO",
};

export default function PageNouveauProprietairePro() {
  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto">
      <Link
        href="/pro/proprietaires"
        className="text-sm hover:underline"
        style={{ color: "#9DB8AD" }}
      >
        ← Retour au répertoire
      </Link>
      <h1
        className="text-2xl mt-4 mb-6"
        style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}
      >
        Nouveau propriétaire
      </h1>
      <FormulaireProprietaire base="/pro" />
    </div>
  );
}
