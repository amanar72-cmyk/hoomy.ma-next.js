import FormulaireInscription from "@/components/auth/FormulaireInscription";

// Server Component pur — pas de "use client", pas d'état, pas de hooks
// La frontière client est explicitement dans FormulaireInscription.tsx
export default function PageInscription() {
  return <FormulaireInscription />;
}
