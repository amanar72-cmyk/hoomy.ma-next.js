import type { Metadata } from "next";
import Navbar from "@/components/home/Navbar";
import CarteIntelligente from "@/components/carte/CarteIntelligente";

export const metadata: Metadata = {
  title: "Carte des quartiers",
  description:
    "Explorez les prix au m², les scores de qualité de vie et les tendances par quartier dans les principales villes du Maroc.",
};

export default function PageCarte() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <Navbar />
      <div style={{ flex: 1, overflow: "hidden" }}>
        <CarteIntelligente />
      </div>
    </div>
  );
}
