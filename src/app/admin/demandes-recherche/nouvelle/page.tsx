import Link from "next/link";
import type { Metadata } from "next";
import FormulaireDemandeRechercheInterne from "@/components/demandes/FormulaireDemandeRechercheInterne";
import { creerDemandeRechercheAdmin } from "../actions";

export const metadata: Metadata = { title: "Nouvelle demande — Administration HOOMY.MA" };

export default function PageNouvelleDemandeAdmin() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <Link href="/admin/demandes-recherche" className="text-sm hover:underline" style={{ color: "#9DB8AD", textDecoration: "none" }}>
        ← Recherches clients
      </Link>
      <h1 className="text-xl font-semibold mt-3 mb-1" style={{ color: "#111" }}>Nouvelle demande</h1>
      <p className="text-sm mb-6" style={{ color: "#999" }}>
        Pour un client contacté par téléphone ou en agence — liée à une fiche du répertoire.
      </p>

      <FormulaireDemandeRechercheInterne
        creerAction={creerDemandeRechercheAdmin}
        basePathApresCreation="/admin/demandes-recherche"
      />
    </div>
  );
}
