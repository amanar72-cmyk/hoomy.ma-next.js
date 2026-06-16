"use client";

import dynamic from "next/dynamic";

// Chargement uniquement côté client — Leaflet requiert window/document
const MapLeaflet = dynamic(() => import("./MapLeaflet"), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center h-full rounded-2xl"
      style={{ background: "#EDE7D7" }}
    >
      <p className="text-sm" style={{ color: "#9DB8AD" }}>Chargement de la carte…</p>
    </div>
  ),
});

type Props = {
  latitude: number | null;
  longitude: number | null;
  titre: string;
};

export default function CarteLocalisation({ latitude, longitude, titre }: Props) {
  if (!latitude || !longitude) return null;

  return (
    <section className="mt-10">
      <h2
        className="text-xl font-normal mb-4"
        style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}
      >
        Localisation
      </h2>

      <div className="rounded-2xl overflow-hidden" style={{ height: 340 }}>
        <MapLeaflet latitude={latitude} longitude={longitude} titre={titre} />
      </div>

      <p className="text-xs mt-2.5 flex items-center gap-1" style={{ color: "#9DB8AD" }}>
        <span aria-hidden="true">📍</span>
        Localisation approximative pour protéger la vie privée du vendeur.
      </p>
    </section>
  );
}
