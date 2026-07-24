import Link from "next/link";
import type { Metadata } from "next";
import FormulaireDemandeRechercheInterne from "@/components/demandes/FormulaireDemandeRechercheInterne";
import { creerDemandeRechercheAgent } from "../actions";

export const metadata: Metadata = { title: "Nouvelle demande — Espace Pro HOOMY.MA" };

export default function PageNouvelleDemandeAgent() {
  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/pro/demandes-recherche" className="text-sm hover:underline" style={{ color: "#9DB8AD", textDecoration: "none" }}>
        ← Recherches clients
      </Link>
      <h1 className="text-xl font-semibold mt-3 mb-1" style={{ color: "#111" }}>Nouvelle demande</h1>
      <p className="text-sm mb-6" style={{ color: "#999" }}>
        Pour un client contacté par téléphone ou en agence — liée à une fiche du répertoire.
      </p>

      <FormulaireDemandeRechercheInterne
        creerAction={creerDemandeRechercheAgent}
        basePathApresCreation="/pro/demandes-recherche"
      />
    </div>
  );
}
