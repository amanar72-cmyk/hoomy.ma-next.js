"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ── Geste de balayage tactile (swipe) ──────────────────────────────────────────
// Seuil de 40px : assez court pour être réactif, assez long pour ne pas
// confondre un swipe horizontal avec un tap ou un scroll vertical accidentel.
const SEUIL_SWIPE_PX = 40;

function useSwipe(onGauche: () => void, onDroite: () => void) {
  const debutX = useRef<number | null>(null);
  const debutY = useRef<number | null>(null);

  return {
    onTouchStart: (e: React.TouchEvent) => {
      debutX.current = e.touches[0].clientX;
      debutY.current = e.touches[0].clientY;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (debutX.current === null || debutY.current === null) return;
      const deltaX = e.changedTouches[0].clientX - debutX.current;
      const deltaY = e.changedTouches[0].clientY - debutY.current;
      debutX.current = null;
      debutY.current = null;
      // Un geste surtout vertical = scroll de page, pas une navigation photo.
      if (Math.abs(deltaX) < SEUIL_SWIPE_PX || Math.abs(deltaX) < Math.abs(deltaY)) return;
      if (deltaX < 0) onDroite();
      else onGauche();
    },
  };
}

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

  const swipe = useSwipe(precedent, suivant);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Galerie — ${titre}`}
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: "rgba(8,12,10,0.97)" }}
      // Fond de la lightbox toujours quasi-noir (jamais réactif au thème) :
      // les icônes/textes ci-dessous restent blancs en dur — var(--fond-secondaire)
      // deviendrait vert nuit foncé en mode sombre, invisible sur ce fond.
    >
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

      <div
        className="flex-1 flex items-center justify-center relative min-h-0 px-16 py-4"
        {...swipe}
      >
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
            ? { background: "var(--accent)", color: "var(--texte-sur-accent)" }
            : { background: "var(--primaire)", color: "var(--fond-secondaire)" }
        }
      >
        {transaction === "location" ? "À louer" : "À vendre"}
      </span>
      {verifie ? (
        <span
          className="text-xs font-medium px-3 py-1.5 rounded-full w-fit flex items-center gap-1.5"
          style={{ background: "rgba(255,255,255,0.92)", color: "var(--primaire-clair)", backdropFilter: "blur(4px)" }}
        >
          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Vérifié HOOMY
        </span>
      ) : (
        <span
          className="text-xs font-medium px-3 py-1.5 rounded-full w-fit flex items-center gap-1.5"
          style={{ background: "rgba(15,76,58,0.85)", color: "#fff", backdropFilter: "blur(4px)" }}
        >
          Bientôt disponible
        </span>
      )}
    </div>
  );
}

// ── Placeholder ───────────────────────────────────────────────────────────────

function Placeholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3" style={{ background: "var(--bordure)" }}>
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#C2BBA3" strokeWidth="1.2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
      <span className="text-sm" style={{ color: "#C2BBA3" }}>Aucune photo disponible</span>
    </div>
  );
}

// ── Bouton "Voir toutes les photos" ──────────────────────────────────────────

function BoutonVoirPhotos({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="absolute bottom-4 right-4 flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-full z-10 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-px"
      style={{
        background: "rgba(255,255,255,0.93)",
        color: "var(--primaire)",
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

// ── Carrousel desktop (2 photos côte à côte) ─────────────────────────────────

function CarrouselDesktop({
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
  const [debut, setDebut] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Sur desktop : 2 photos visibles à la fois
  const PAR_PAGE = 2;
  const maxDebut = Math.max(0, photos.length - PAR_PAGE);

  function scrollVers(idx: number) {
    const el = scrollRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(idx, maxDebut));
    setDebut(clamped);
    // La largeur d'une photo = moitié du conteneur visible
    el.scrollTo({ left: clamped * (el.clientWidth / PAR_PAGE), behavior: "smooth" });
  }

  function surScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const cellW = el.clientWidth / PAR_PAGE;
    if (cellW === 0) return;
    const nouvel = Math.min(Math.round(el.scrollLeft / cellW), maxDebut);
    if (nouvel !== debut) setDebut(nouvel);
  }

  // ── 0 photo ──────────────────────────────────────────────────────────────
  if (photos.length === 0) {
    return (
      <div className="hidden md:block relative rounded-2xl overflow-hidden" style={{ height: 480 }}>
        <Badges transaction={transaction} verifie={verifie} />
        <Placeholder />
      </div>
    );
  }

  // ── 1 photo → plein écran, pas de flèches ────────────────────────────────
  if (photos.length === 1) {
    return (
      <div
        className="hidden md:block relative rounded-2xl overflow-hidden cursor-pointer group"
        style={{ height: 480 }}
        onClick={() => onOpen(0)}
      >
        <img
          src={photos[0]}
          alt={titre}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          draggable={false}
        />
        <Badges transaction={transaction} verifie={verifie} />
      </div>
    );
  }

  // ── 2+ photos → carrousel horizontal 2-up ────────────────────────────────
  return (
    <div className="hidden md:block relative rounded-2xl overflow-hidden" style={{ height: 480 }}>
      {/*
        Scrollbar masquée :
        · scrollbar-width: none   → Firefox
        · ::-webkit-scrollbar     → Chrome / Safari (via la règle <style> ci-dessous)
      */}
      <style>{`.galerie-scroll::-webkit-scrollbar{display:none}`}</style>

      <div
        ref={scrollRef}
        className="galerie-scroll flex h-full"
        style={{ overflowX: "auto", scrollbarWidth: "none" }}
        onScroll={surScroll}
      >
        {photos.map((url, i) => (
          <div
            key={i}
            className="h-full cursor-pointer overflow-hidden group relative"
            style={{ flex: "0 0 50%" }}
            onClick={() => onOpen(i)}
          >
            <img
              src={url}
              alt={`${titre} — photo ${i + 1}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              draggable={false}
            />
            {/* Filet de séparation entre photos */}
            {i < photos.length - 1 && (
              <div
                className="absolute top-0 right-0 bottom-0"
                style={{ width: 2, background: "var(--fond-principal)" }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Badges (vente/location + vérifié) */}
      <Badges transaction={transaction} verifie={verifie} />

      {/* Flèche gauche */}
      {debut > 0 && (
        <button
          type="button"
          onClick={() => scrollVers(debut - 1)}
          aria-label="Photos précédentes"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110 z-10"
          style={{
            background: "rgba(255,255,255,0.92)",
            color: "var(--primaire)",
            boxShadow: "0 2px 16px rgba(0,0,0,0.18)",
          }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Flèche droite */}
      {debut < maxDebut && (
        <button
          type="button"
          onClick={() => scrollVers(debut + 1)}
          aria-label="Photos suivantes"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110 z-10"
          style={{
            background: "rgba(255,255,255,0.92)",
            color: "var(--primaire)",
            boxShadow: "0 2px 16px rgba(0,0,0,0.18)",
          }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Bouton "Voir les X photos" */}
      <BoutonVoirPhotos count={photos.length} onClick={() => onOpen(0)} />
    </div>
  );
}

// ── Carrousel mobile (1 photo) ────────────────────────────────────────────────

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
  const precedent = () => setIndex((i) => (i - 1 + photos.length) % photos.length);
  const suivant = () => setIndex((i) => (i + 1) % photos.length);
  const swipe = useSwipe(precedent, suivant);

  // Plein bord (pas d'arrondi, pas de marge) : le conteneur parent n'a plus de
  // padding sur mobile — voir px-0 md:px-6 dans les pages /acheter et /louer.
  // aspect-[4/3] (pas une hauteur fixe) : les photos restent grandes et
  // proportionnées quelle que soit la largeur de l'écran.
  return (
    <div className="relative overflow-hidden md:hidden aspect-[4/3]" {...swipe}>
      <div className="w-full h-full cursor-pointer" onClick={() => onOpen(index)}>
        {photos[index] ? (
          <img src={photos[index]} alt={`${titre} — photo ${index + 1}`} className="w-full h-full object-cover" draggable={false} />
        ) : (
          <Placeholder />
        )}
      </div>

      <Badges transaction={transaction} verifie={verifie} />

      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={precedent}
            aria-label="Photo précédente"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(255,255,255,0.88)", color: "var(--primaire)" }}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={suivant}
            aria-label="Photo suivante"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(255,255,255,0.88)", color: "var(--primaire)" }}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function GaleriePhotos({ photos, titre, transaction, verifie }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      {/* Desktop : carrousel 2-up */}
      <CarrouselDesktop
        photos={photos}
        titre={titre}
        transaction={transaction}
        verifie={verifie}
        onOpen={setLightboxIndex}
      />

      {/* Mobile : carrousel 1-up */}
      <CarrouselMobile
        photos={photos}
        titre={titre}
        transaction={transaction}
        verifie={verifie}
        onOpen={setLightboxIndex}
      />

      {/* Lightbox plein écran */}
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
