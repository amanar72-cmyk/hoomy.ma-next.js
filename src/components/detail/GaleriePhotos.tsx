"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

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
  /** Cible du bouton retour posé sur la photo — « /acheter » ou « /louer ». */
  hrefRetour: string;
};

// ── Lightbox plein écran ──────────────────────────────────────────────────────

// Fond plein et opaque : sur iPhone, l'ancien fond semi-transparent laissait
// deviner la page derrière la visionneuse.
const FOND_LIGHTBOX = "#080C0A";

/**
 * Hauteur maximale de la photo = écran − bandeau du haut − bande de vignettes.
 * 100dvh (et non 100vh) suit la barre d'adresse de Safari qui apparaît et
 * disparaît, sinon le bas de la photo passerait sous la barre.
 * Mobile : bandeau 61px + vignettes 63px ≈ 124px (+ marge).
 * Desktop : bandeau 69px + vignettes 69px + respiration 32px ≈ 170px.
 */
const CLASSES_PHOTO =
  "block w-auto h-auto object-contain select-none " +
  "max-w-[100vw] max-h-[calc(100dvh-132px)] " +
  "md:max-w-[calc(100vw-48px)] md:max-h-[calc(100dvh-172px)] md:rounded-xl";

// Flèches POSÉES SUR la photo (et non plus isolées dans les marges de côté) :
// cercle sombre translucide + flou, lisible sur une photo claire comme foncée.
const CLASSES_FLECHE =
  "absolute top-1/2 -translate-y-1/2 w-10 h-10 md:w-11 md:h-11 rounded-full " +
  "flex items-center justify-center cursor-pointer transition-transform active:scale-95 md:hover:scale-105";
const STYLE_FLECHE: React.CSSProperties = {
  background: "rgba(8,12,10,0.45)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.22)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
};

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
  const vignettesRef = useRef<HTMLDivElement>(null);

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

  // La vignette active reste visible quand on navigue avec les flèches.
  useEffect(() => {
    const actif = vignettesRef.current?.querySelector<HTMLElement>('[aria-current="true"]');
    actif?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [index]);

  const swipe = useSwipe(precedent, suivant);

  const contenu = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Galerie — ${titre}`}
      // z-[10100] : la visionneuse plein écran doit passer AU-DESSUS de tous
      // les éléments flottants (barre de prix 10000, bouton de chat 9999,
      // fenêtre de chat 9998).
      className="fixed inset-0 z-[10100] flex flex-col"
      style={{ background: FOND_LIGHTBOX }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 md:px-5 md:py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <p className="text-sm truncate min-w-0 mr-4" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-marcellus),serif" }}>
          {titre}
        </p>
        <div className="flex items-center gap-4 flex-shrink-0">
          <span className="text-sm tabular-nums" style={{ color: "rgba(255,255,255,0.7)" }}>
            {index + 1}&thinsp;/&thinsp;{photos.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la galerie"
            className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-colors"
            style={{ background: "rgba(255,255,255,0.14)", color: "#fff" }}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/*
        Zone photo SANS marge latérale sur mobile : l'ancienne marge de 64px de
        chaque côté (réservée aux flèches) rétrécissait une photo paysage à
        ~270px de large sur iPhone. Elle prend désormais toute la largeur, et
        les flèches sont posées dessus.
      */}
      <div className="flex-1 flex items-center justify-center min-h-0 md:px-6 md:py-4" {...swipe}>
        <div className="relative">
          <img
            key={index}
            src={photos[index]}
            alt={`${titre} — photo ${index + 1}`}
            className={CLASSES_PHOTO}
            draggable={false}
          />
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={precedent}
                aria-label="Photo précédente"
                className={`${CLASSES_FLECHE} left-2.5 md:left-4`}
                style={STYLE_FLECHE}
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={suivant}
                aria-label="Photo suivante"
                className={`${CLASSES_FLECHE} right-2.5 md:right-4`}
                style={STYLE_FLECHE}
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {photos.length > 1 && (
        <div
          ref={vignettesRef}
          className="galerie-scroll flex-shrink-0 py-3 px-4 flex gap-2 overflow-x-auto md:justify-center"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)", scrollbarWidth: "none" }}
        >
          {photos.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Photo ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              className="flex-shrink-0 rounded-lg overflow-hidden cursor-pointer transition-all w-[52px] h-[38px] md:w-[60px] md:h-[44px]"
              style={{
                opacity: i === index ? 1 : 0.4,
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

  // Rendue directement dans <body> : aucun parent (animation, transform,
  // overflow) ne peut ainsi la rogner ni la faire passer sous la page.
  return createPortal(contenu, document.body);
}

// ── Bouton retour posé sur la photo ──────────────────────────────────────────

/**
 * Le fil d'Ariane qui occupait le haut de page a été retiré : la photo démarre
 * désormais juste sous la navbar. Ce bouton reprend sa fonction de sortie, mais
 * flotte sur l'image — sans repousser le contenu vers le bas.
 *
 * C'est un vrai lien, pas un history.back() : la majorité des visiteurs
 * arrivent en direct (publicité Meta, lien WhatsApp) et n'ont pas de page
 * précédente sur le site — un retour arrière les ferait SORTIR de HOOMY. Le
 * lien garde en prime le maillage interne vers la liste que le fil d'Ariane
 * assurait, et fonctionne sans JavaScript.
 */
function BoutonRetour({ href }: { href: string }) {
  return (
    <a
      href={href}
      aria-label="Retour aux annonces"
      className="absolute top-4 left-4 z-20 flex items-center justify-center rounded-2xl cursor-pointer transition-all hover:scale-105"
      style={{
        width: 44,
        height: 44,
        background: "rgba(255,255,255,0.95)",
        color: "var(--primaire)",
        boxShadow: "0 2px 14px rgba(0,0,0,0.16)",
        backdropFilter: "blur(6px)",
        textDecoration: "none",
      }}
    >
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </a>
  );
}

// ── Badges ────────────────────────────────────────────────────────────────────

// Alignés à DROITE : le coin haut-gauche est désormais occupé par le bouton
// retour, qui doit rester le repère de sortie le plus évident.
function Badges({ transaction, verifie }: { transaction: string; verifie: boolean }) {
  return (
    <div className="absolute top-4 right-4 flex flex-col items-end gap-2 z-10 pointer-events-none">
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
  hrefRetour,
  onOpen,
}: {
  photos: string[];
  titre: string;
  transaction: string;
  verifie: boolean;
  hrefRetour: string;
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
        <BoutonRetour href={hrefRetour} />
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
        <BoutonRetour href={hrefRetour} />
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
      <BoutonRetour href={hrefRetour} />
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
  hrefRetour,
  onOpen,
}: {
  photos: string[];
  titre: string;
  transaction: string;
  verifie: boolean;
  hrefRetour: string;
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

      <BoutonRetour href={hrefRetour} />
      <Badges transaction={transaction} verifie={verifie} />

      {/*
        Flèches APPARIÉES en bas à droite, et non plus centrées sur les deux
        bords. Le bouton retour occupe désormais le coin haut-gauche avec un
        chevron « ‹ » : une flèche « photo précédente » au milieu du même bord
        affichait le MÊME icône, sur le MÊME côté, pour deux actions très
        différentes — quitter l'annonce ou reculer d'une photo. Réunies dans un
        coin libre, les deux flèches se lisent comme une seule commande de
        navigation photo.
      */}
      {photos.length > 1 && (
        <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10">
          <button
            type="button"
            onClick={precedent}
            aria-label="Photo précédente"
            className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
            style={{
              background: "rgba(255,255,255,0.93)",
              color: "var(--primaire)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.14)",
            }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={suivant}
            aria-label="Photo suivante"
            className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
            style={{
              background: "rgba(255,255,255,0.93)",
              color: "var(--primaire)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.14)",
            }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}

    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function GaleriePhotos({ photos, titre, transaction, verifie, hrefRetour }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      {/* Desktop : carrousel 2-up */}
      <CarrouselDesktop
        photos={photos}
        titre={titre}
        transaction={transaction}
        verifie={verifie}
        hrefRetour={hrefRetour}
        onOpen={setLightboxIndex}
      />

      {/* Mobile : carrousel 1-up */}
      <CarrouselMobile
        photos={photos}
        titre={titre}
        transaction={transaction}
        verifie={verifie}
        hrefRetour={hrefRetour}
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
