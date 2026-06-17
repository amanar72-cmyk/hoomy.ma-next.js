"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  photos: string[];
  titre: string;
  transaction: string;
  verifie: boolean;
};

// ── Lightbox plein écran ──────────────────────────────────────────────────────

function Lightbox({
  photos,
  indexInitial,
  titre,
  onClose,
}: {
  photos: string[];
  indexInitial: number;
  titre: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(indexInitial);

  const precedent = useCallback(
    () => setIndex((i) => (i - 1 + photos.length) % photos.length),
    [photos.length]
  );
  const suivant = useCallback(
    () => setIndex((i) => (i + 1) % photos.length),
    [photos.length]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") precedent();
      if (e.key === "ArrowRight") suivant();
    };
    document.addEventListener("keydown", handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = prev;
    };
  }, [onClose, precedent, suivant]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Galerie — ${titre}`}
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: "rgba(8,12,10,0.97)" }}
    >
      {/* ── Barre haut ── */}
      <div
        className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <p className="text-sm truncate max-w-xs" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-marcellus),serif" }}>
          {titre}
        </p>
        <div className="flex items-center gap-5">
          <span className="text-sm tabular-nums" style={{ color: "rgba(255,255,255,0.5)" }}>
            {index + 1}&thinsp;/&thinsp;{photos.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la galerie"
            className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-colors"
            style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Image principale ── */}
      <div className="flex-1 flex items-center justify-center relative min-h-0 px-16 py-4">
        <img
          key={index}
          src={photos[index]}
          alt={`${titre} — photo ${index + 1}`}
          className="max-h-full max-w-full object-contain rounded-xl motion-safe:transition-opacity motion-safe:duration-200"
          draggable={false}
        />

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={precedent}
              aria-label="Photo précédente"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-105"
              style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}
            >
              <svg width="19" height="19" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={suivant}
              aria-label="Photo suivante"
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-105"
              style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}
            >
              <svg width="19" height="19" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* ── Miniatures ── */}
      {photos.length > 1 && (
        <div
          className="flex-shrink-0 py-3 px-4 flex gap-2 overflow-x-auto justify-center"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          {photos.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Photo ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              className="flex-shrink-0 rounded-lg overflow-hidden cursor-pointer transition-all"
              style={{
                width: 60,
                height: 44,
                opacity: i === index ? 1 : 0.38,
                outline: i === index ? "2px solid #D4AF37" : "2px solid transparent",
                outlineOffset: 2,
              }}
            >
              <img src={url} alt="" className="w-full h-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Badges ────────────────────────────────────────────────────────────────────

function Badges({ transaction, verifie }: { transaction: string; verifie: boolean }) {
  return (
    <div className="absolute top-4 left-4 flex flex-col gap-2 z-10 pointer-events-none">
      <span
        className="text-xs font-semibold px-3 py-1.5 rounded-full w-fit"
        style={
          transaction === "location"
            ? { background: "#D4AF37", color: "#0F4C3A" }
            : { background: "#0F4C3A", color: "#fff" }
        }
      >
        {transaction === "location" ? "À louer" : "À vendre"}
      </span>
      {verifie && (
        <span
          className="text-xs font-medium px-3 py-1.5 rounded-full w-fit flex items-center gap-1.5"
          style={{ background: "rgba(255,255,255,0.92)", color: "#146C43", backdropFilter: "blur(4px)" }}
        >
          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Vérifié HOOMY
        </span>
      )}
    </div>
  );
}

// ── Placeholder ───────────────────────────────────────────────────────────────

function Placeholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3" style={{ background: "#EDE7D7" }}>
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#C2BBA3" strokeWidth="1.2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
      <span className="text-sm" style={{ color: "#C2BBA3" }}>Aucune photo disponible</span>
    </div>
  );
}

// ── Carrousel mobile ──────────────────────────────────────────────────────────

function CarrouselMobile({
  photos,
  titre,
  transaction,
  verifie,
  onOpen,
}: {
  photos: string[];
  titre: string;
  transaction: string;
  verifie: boolean;
  onOpen: (i: number) => void;
}) {
  const [index, setIndex] = useState(0);

  return (
    <div className="relative rounded-2xl overflow-hidden md:hidden" style={{ height: 280 }}>
      <div className="w-full h-full cursor-pointer" onClick={() => onOpen(index)}>
        {photos[index] ? (
          <img src={photos[index]} alt={`${titre} — photo ${index + 1}`} className="w-full h-full object-cover" />
        ) : (
          <Placeholder />
        )}
      </div>

      <Badges transaction={transaction} verifie={verifie} />

      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
            aria-label="Photo précédente"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(255,255,255,0.88)", color: "#0F4C3A" }}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % photos.length)}
            aria-label="Photo suivante"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(255,255,255,0.88)", color: "#0F4C3A" }}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      <div className="absolute bottom-3 right-3 flex items-center gap-2">
        <span className="text-xs px-2.5 py-1 rounded-full tabular-nums" style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}>
          {index + 1} / {photos.length}
        </span>
      </div>
    </div>
  );
}

// ── Mosaïque desktop ──────────────────────────────────────────────────────────

function MosaiqueBien({
  photos,
  titre,
  transaction,
  verifie,
  onOpen,
}: {
  photos: string[];
  titre: string;
  transaction: string;
  verifie: boolean;
  onOpen: (i: number) => void;
}) {
  // Cas : 0 photo
  if (photos.length === 0) {
    return (
      <div className="hidden md:block relative w-full rounded-2xl overflow-hidden" style={{ height: 520 }}>
        <Badges transaction={transaction} verifie={verifie} />
        <Placeholder />
      </div>
    );
  }

  // Cas : 1 seule photo → pleine largeur
  if (photos.length === 1) {
    return (
      <div
        className="hidden md:block relative w-full rounded-2xl overflow-hidden cursor-pointer group"
        style={{ height: 520 }}
        onClick={() => onOpen(0)}
      >
        <img src={photos[0]} alt={titre} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <Badges transaction={transaction} verifie={verifie} />
        <BoutonVoirPhotos count={photos.length} onClick={() => onOpen(0)} />
      </div>
    );
  }

  // Cas : 2+ photos → mosaïque
  const gridPhotos = photos.slice(1, 5); // max 4 photos droite
  const nbCaches = photos.length > 5 ? photos.length - 5 : 0;

  // Calcul grille droite
  const nbDroite = gridPhotos.length;
  let gridCols = "1fr";
  let gridRows = "1fr";
  if (nbDroite >= 3) { gridCols = "1fr 1fr"; gridRows = "1fr 1fr"; }
  else if (nbDroite === 2) { gridCols = "1fr"; gridRows = "1fr 1fr"; }

  return (
    <div className="hidden md:flex gap-2 relative" style={{ height: 520 }}>
      {/* ── Photo principale gauche ── */}
      <div
        className="relative rounded-2xl overflow-hidden cursor-pointer group flex-shrink-0"
        style={{ width: gridPhotos.length === 0 ? "100%" : "60%" }}
        onClick={() => onOpen(0)}
      >
        <img
          src={photos[0]}
          alt={`${titre} — photo principale`}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <Badges transaction={transaction} verifie={verifie} />
      </div>

      {/* ── Grille droite ── */}
      {gridPhotos.length > 0 && (
        <div
          className="flex-1 rounded-2xl overflow-hidden"
          style={{ display: "grid", gap: 8, gridTemplateColumns: gridCols, gridTemplateRows: gridRows }}
        >
          {gridPhotos.map((url, i) => {
            const idxReel = i + 1;
            const estDernier = i === gridPhotos.length - 1 && nbCaches > 0;
            // Photo à 3 (index 2) avec seulement 3 photos droite → span 2 cols
            const span2 = nbDroite === 3 && i === 2;

            return (
              <div
                key={url}
                className="relative overflow-hidden cursor-pointer group"
                style={{ gridColumn: span2 ? "1 / -1" : undefined }}
                onClick={() => onOpen(idxReel)}
              >
                <img
                  src={url}
                  alt={`${titre} — photo ${idxReel + 1}`}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {estDernier && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-1 cursor-pointer"
                    style={{ background: "rgba(15,76,58,0.72)", backdropFilter: "blur(2px)" }}
                  >
                    <span className="text-3xl font-bold text-white">+{nbCaches}</span>
                    <span className="text-sm text-white opacity-80">photos</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Bouton "Voir toutes les photos" ── */}
      <BoutonVoirPhotos count={photos.length} onClick={() => onOpen(0)} />
    </div>
  );
}

// ── Bouton voir toutes les photos ─────────────────────────────────────────────

function BoutonVoirPhotos({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="absolute bottom-4 right-4 flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-full z-10 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-px"
      style={{
        background: "rgba(255,255,255,0.93)",
        color: "#0F4C3A",
        boxShadow: "0 2px 16px rgba(0,0,0,0.18)",
        backdropFilter: "blur(6px)",
      }}
    >
      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
      Voir les {count} photos
    </button>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function GaleriePhotos({ photos, titre, transaction, verifie }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      {/* Desktop */}
      <MosaiqueBien
        photos={photos}
        titre={titre}
        transaction={transaction}
        verifie={verifie}
        onOpen={setLightboxIndex}
      />

      {/* Mobile */}
      <CarrouselMobile
        photos={photos}
        titre={titre}
        transaction={transaction}
        verifie={verifie}
        onOpen={setLightboxIndex}
      />

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos.length > 0 ? photos : []}
          indexInitial={lightboxIndex}
          titre={titre}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
