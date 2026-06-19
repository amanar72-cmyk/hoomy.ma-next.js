"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Quartier } from "./CarteMapboxIntelligente";

const CarteMapbox = dynamic(() => import("./CarteMapboxIntelligente"), {
  ssr: false,
  loading: () => (
    <div
      className="flex flex-col items-center justify-center h-full gap-4"
      style={{ background: "#EDE7D7" }}
    >
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9DB8AD" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a10 10 0 0 1 0 20" strokeDasharray="4 4" />
      </svg>
      <p style={{ color: "#9DB8AD", fontFamily: "var(--font-outfit, sans-serif)", fontSize: 14 }}>
        Chargement de la carte…
      </p>
    </div>
  ),
});

export default function CarteIntelligente() {
  const [quartiers, setQuartiers] = useState<Quartier[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("quartiers")
      .select(
        "nom, nom_ar, ville, latitude, longitude, prix_m2_appartement, prix_m2_villa, evolution_pct, score_ecoles, score_hopitaux, score_transports, score_commerces, score_securite, score_espaces_verts"
      )
      .then(({ data, error }) => {
        if (error) {
          setErreur("Impossible de charger les données des quartiers.");
        } else {
          setQuartiers((data as Quartier[]) ?? []);
        }
        setChargement(false);
      });
  }, []);

  if (chargement) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ background: "#EDE7D7" }}
      >
        <p style={{ color: "#9DB8AD", fontFamily: "var(--font-outfit, sans-serif)", fontSize: 14 }}>
          Chargement des quartiers…
        </p>
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <p style={{ color: "#DC2626", fontSize: 14 }}>{erreur}</p>
        <p style={{ color: "#9DB8AD", fontSize: 13 }}>
          Contactez un conseiller HOOMY pour obtenir les prix de votre quartier.
        </p>
      </div>
    );
  }

  if (quartiers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <p style={{ color: "#9DB8AD", fontSize: 14 }}>
          Aucun quartier disponible pour le moment.
        </p>
        <p style={{ color: "#C4BFAE", fontSize: 12 }}>
          La base de données des quartiers est en cours de constitution.
        </p>
      </div>
    );
  }

  return <CarteMapbox quartiers={quartiers} />;
}
