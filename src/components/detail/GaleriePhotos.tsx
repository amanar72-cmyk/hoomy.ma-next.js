"use client";

import { useState } from "react";

type Props = {
  photos: string[];
  titre: string;
  transaction: string;
  verifie: boolean;
};

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2" style={{ background: "#EDE7D7" }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#C2BBA3" strokeWidth="1.4">
        <path d="M3 11L12 4l9 7M5 9.5V20h14V9.5" />
      </svg>
      <span className="text-xs" style={{ color: "#C2BBA3" }}>{label}</span>
    </div>
  );
}

export default function GaleriePhotos({ photos, titre, transaction, verifie }: Props) {
  const [photoActive, setPhotoActive] = useState(0);
  const [modalOuvert, setModalOuvert] = useState(false);

  if (photos.length === 0) {
    return (
      <div className="w-full rounded-2xl overflow-hidden" style={{ height: 480 }}>
        <Placeholder label="Pas de photos disponibles" />
      </div>
    );
  }

  // Miniatures : photos 1, 2, 3 (indices 1–3)
  const thumbs = photos.slice(1, 4);
  // Photos cachées après les 4 premières
  const nbCachees = photos.length > 4 ? photos.length - 4 : 0;

  return (
    <>
      <div className="flex gap-3" style={{ height: 480 }}>

        {/* ── Photo principale (70 %) ── */}
        <div className="relative overflow-hidden rounded-2xl" style={{ flex: "0 0 70%" }}>
          {photos[photoActive] ? (
            <img
              src={photos[photoActive]}
              alt={`${titre} — photo ${photoActive + 1}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <Placeholder label="Photo indisponible" />
          )}

          {/* Badges empilés */}
          <div className="absolute top-4 left-4 flex flex-col gap-1.5">
            <span
              className="text-xs px-3 py-1.5 rounded font-medium w-fit"
              style={
                transaction === "location"
                  ? { background: "#D4AF37", color: "#0F4C3A" }
                  : { background: "#146C43", color: "#fff" }
              }
            >
              {transaction === "location" ? "À louer" : "À vendre"}
            </span>
            {verifie && (
              <span
                className="text-xs px-3 py-1.5 rounded border w-fit"
                style={{ background: "#fff", color: "#146C43", borderColor: "#146C43" }}
              >
                ✓ Vérifié HOOMY
              </span>
            )}
          </div>

          {/* Compteur */}
          <span
            className="absolute bottom-4 right-4 text-xs px-2.5 py-1 rounded-full"
            style={{ background: "rgba(0,0,0,0.45)", color: "#fff" }}
          >
            {photoActive + 1} / {photos.length}
          </span>

          {/* Navigation flèches */}
          {photos.length > 1 && (
            <>
              <button
                onClick={() => setPhotoActive((p) => (p - 1 + photos.length) % photos.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold transition-colors cursor-pointer"
                style={{ background: "rgba(255,255,255,0.85)", color: "#0F4C3A" }}
                aria-label="Photo précédente"
              >
                ‹
              </button>
              <button
                onClick={() => setPhotoActive((p) => (p + 1) % photos.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold transition-colors cursor-pointer"
                style={{ background: "rgba(255,255,255,0.85)", color: "#0F4C3A" }}
                aria-label="Photo suivante"
              >
                ›
              </button>
            </>
          )}
        </div>

        {/* ── Colonne miniatures (30 %) ── */}
        {thumbs.length > 0 && (
          <div className="flex flex-col gap-2 flex-1">
            {thumbs.map((url, i) => {
              const idx = i + 1; // indice réel dans photos[]
              // Dernier slot → overlay "+N" si des photos sont cachées
              const estDernier = i === 2 && nbCachees > 0;

              return (
                <div
                  key={url}
                  className="relative overflow-hidden rounded-xl cursor-pointer flex-1 transition-opacity hover:opacity-90"
                  style={{ border: photoActive === idx ? "2px solid #D4AF37" : "2px solid transparent" }}
                  onClick={() => estDernier ? setModalOuvert(true) : setPhotoActive(idx)}
                >
                  <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                  {estDernier && (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center text-white"
                      style={{ background: "rgba(15,76,58,0.72)" }}
                    >
                      <span className="text-2xl font-bold">+{nbCachees + 1}</span>
                      <span className="text-xs mt-0.5">photos</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Bouton explicite si < 3 miniatures mais photos supplémentaires */}
            {photos.length > 4 && thumbs.length < 3 && (
              <button
                onClick={() => setModalOuvert(true)}
                className="flex-1 rounded-xl text-sm font-medium transition-opacity hover:opacity-90 cursor-pointer flex items-center justify-center"
                style={{ background: "#0F4C3A", color: "#fff" }}
              >
                Voir toutes les photos ({photos.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Modal toutes les photos ── */}
      {modalOuvert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.88)" }}
          onClick={() => setModalOuvert(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-normal" style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}>
                Toutes les photos ({photos.length})
              </h3>
              <button
                onClick={() => setModalOuvert(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm hover:bg-gray-100 cursor-pointer transition-colors"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {photos.map((url, i) => (
                <div
                  key={`${url}-${i}`}
                  className="aspect-[4/3] overflow-hidden rounded-xl cursor-pointer"
                  onClick={() => { setPhotoActive(i); setModalOuvert(false); }}
                >
                  <img
                    src={url}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
