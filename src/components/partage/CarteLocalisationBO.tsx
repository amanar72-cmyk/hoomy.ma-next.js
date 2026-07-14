"use client";

// Bloc carte Mapbox pour le back-office (fiches pro/admin) — réutilise
// MapboxLocalisation sans la légende « localisation approximative » des pages
// publiques : ici les coordonnées affichées sont celles saisies en base.

import dynamic from "next/dynamic";

const MapboxLocalisation = dynamic(() => import("@/components/detail/MapboxLocalisation"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full" style={{ background: "#F4F6F5" }}>
      <p className="text-sm" style={{ color: "#9DB8AD" }}>Chargement de la carte…</p>
    </div>
  ),
});

type Props = {
  latitude: number | null;
  longitude: number | null;
  titre: string;
  bienId: string;
};

export default function CarteLocalisationBO({ latitude, longitude, titre, bienId }: Props) {
  if (!latitude || !longitude) {
    return (
      <div
        className="rounded-2xl py-10 text-center text-sm"
        style={{ background: "#FAFAF8", border: "1px dashed #E8E2D2", color: "#9DB8AD" }}
      >
        Aucune coordonnée GPS renseignée pour ce bien
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ height: 280, border: "1px solid #EDE7D7", boxShadow: "0 2px 16px rgba(15,76,58,0.06)" }}
    >
      <MapboxLocalisation latitude={latitude} longitude={longitude} titre={titre} bienId={bienId} />
    </div>
  );
}
