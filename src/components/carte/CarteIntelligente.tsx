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
      style={{ background: "var(--bordure)" }}
    >
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--texte-tertiaire)" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a10 10 0 0 1 0 20" strokeDasharray="4 4" />
      </svg>
      <p style={{ color: "var(--texte-tertiaire)", fontFamily: "var(--font-outfit, sans-serif)", fontSize: 14 }}>
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

  return (
    <div style={{ width: "100%", height: "100%" }}>
      {chargement ? (
        <div
          className="flex items-center justify-center h-full"
          style={{ background: "var(--bordure)" }}
        >
          <p style={{ color: "var(--texte-tertiaire)", fontFamily: "var(--font-outfit, sans-serif)", fontSize: 14 }}>
            Chargement des quartiers…
          </p>
        </div>
      ) : erreur ? (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
          <p style={{ color: "var(--erreur)", fontSize: 14 }}>{erreur}</p>
          <p style={{ color: "var(--texte-tertiaire)", fontSize: 13 }}>
            Contactez un conseiller HOOMY pour obtenir les prix de votre quartier.
          </p>
        </div>
      ) : quartiers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
          <p style={{ color: "var(--texte-tertiaire)", fontSize: 14 }}>
            Aucun quartier disponible pour le moment.
          </p>
          <p style={{ color: "var(--texte-pale)", fontSize: 12 }}>
            La base de données des quartiers est en cours de constitution.
          </p>
        </div>
      ) : (
        <CarteMapbox quartiers={quartiers} />
      )}
    </div>
  );
}
