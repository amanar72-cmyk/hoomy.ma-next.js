"use client";

import dynamic from "next/dynamic";

const CartePickerMapbox = dynamic(() => import("./CartePickerMapbox"), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center h-full rounded-xl"
      style={{ background: "var(--bordure)" }}
    >
      <p style={{ color: "var(--texte-tertiaire)", fontFamily: "var(--font-outfit,sans-serif)", fontSize: 13 }}>
        Chargement de la carte…
      </p>
    </div>
  ),
});

type Props = {
  latitude: number | null;
  longitude: number | null;
  ville: string;
  quartier?: string;
  onChangement: (lat: number | null, lng: number | null) => void;
};

export default function ChampLocalisationCarte({ latitude, longitude, ville, quartier, onChangement }: Props) {
  return (
    <div>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          height: 300,
          border: "1px solid #E0DAC8",
          boxShadow: "0 1px 8px rgba(15,76,58,0.06)",
        }}
      >
        <CartePickerMapbox
          initialLat={latitude}
          initialLng={longitude}
          ville={ville}
          quartier={quartier}
          onChange={onChangement}
        />
      </div>

      {/* Affichage des coordonnées */}
      <div className="flex items-center gap-2 mt-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--texte-tertiaire)" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        {latitude && longitude ? (
          <span style={{ fontSize: 12, color: "var(--texte-secondaire)" }}>
            Position sélectionnée :{" "}
            <span style={{ fontWeight: 600, color: "var(--primaire)" }}>
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </span>
          </span>
        ) : (
          <span style={{ fontSize: 12, color: "#B4AD97" }}>
            Aucune position définie — cliquez sur la carte pour placer l'épingle
          </span>
        )}
      </div>
    </div>
  );
}
