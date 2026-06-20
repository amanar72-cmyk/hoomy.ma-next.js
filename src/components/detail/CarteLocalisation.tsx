"use client";

import dynamic from "next/dynamic";

const MapboxLocalisation = dynamic(() => import("./MapboxLocalisation"), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center h-full rounded-2xl"
      style={{ background: "var(--bordure)" }}
    >
      <p className="text-sm" style={{ color: "var(--texte-tertiaire)" }}>Chargement de la carte…</p>
    </div>
  ),
});

type Props = {
  latitude: number | null;
  longitude: number | null;
  titre: string;
  bienId: string;
};

export default function CarteLocalisation({ latitude, longitude, titre, bienId }: Props) {
  if (!latitude || !longitude) return null;

  return (
    <section className="mb-10">
      <h2
        className="text-xl font-normal mb-5"
        style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}
      >
        Localisation
      </h2>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ height: 320, border: "1px solid #EDE7D7", boxShadow: "0 2px 16px rgba(15,76,58,0.06)" }}
      >
        <MapboxLocalisation latitude={latitude} longitude={longitude} titre={titre} bienId={bienId} />
      </div>

      <p
        className="text-xs mt-3 flex items-center gap-1.5"
        style={{ color: "var(--texte-tertiaire)" }}
      >
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        Localisation approximative pour protéger la vie privée
      </p>
    </section>
  );
}
