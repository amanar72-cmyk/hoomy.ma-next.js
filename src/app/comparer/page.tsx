import { Suspense } from "react";
import PageComparateurClient from "./PageComparateurClient";

export const metadata = {
  title: "Comparateur de biens | HOOMY.MA",
  description: "Comparez jusqu'à 4 biens immobiliers côte à côte avec analyse IA.",
};

function Chargement() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--fond-principal)",
      }}
    >
      <p style={{ color: "var(--texte-tertiaire)", fontFamily: "var(--font-outfit, sans-serif)" }}>
        Chargement du comparateur…
      </p>
    </div>
  );
}

export default function PageComparer() {
  return (
    <Suspense fallback={<Chargement />}>
      <PageComparateurClient />
    </Suspense>
  );
}
