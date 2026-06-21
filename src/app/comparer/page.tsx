import { Suspense } from "react";
import Navbar from "@/components/home/Navbar";
import PageComparateurClient from "./PageComparateurClient";

export const metadata = {
  title: "Comparateur de biens | HOOMY.MA",
  description: "Comparez jusqu'à 4 biens immobiliers côte à côte avec analyse IA.",
};

function Chargement() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
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
    <div style={{ minHeight: "100vh", background: "var(--fond-principal)" }}>
      <Navbar />
      <Suspense fallback={<Chargement />}>
        <PageComparateurClient />
      </Suspense>
    </div>
  );
}
