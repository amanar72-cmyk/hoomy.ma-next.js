"use client";

import { useState } from "react";
import Link from "next/link";
import type { Bien } from "@/lib/types";
import { trackEvenement } from "@/lib/tracking/track";
import { useComparateur } from "@/lib/comparateur/ComparateurContext";

// ── Utilitaires ───────────────────────────────────────────────────────────────

function cheminBien(bien: Bien) {
  return `/${bien.transaction === "location" ? "louer" : "acheter"}/${bien.slug ?? bien.id}`;
}

// ── Icônes SVG ────────────────────────────────────────────────────────────────

function IcCoeur({ plein }: { plein: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24"
      fill={plein ? "var(--accent)" : "none"}
      stroke={plein ? "var(--accent)" : "rgba(15,76,58,0.6)"}
      strokeWidth="2"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function IcPin() {
  return (
    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IcSurface() {
  return (
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M3 9h18" strokeOpacity="0.4" />
    </svg>
  );
}

function IcChambre() {
  return (
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10H2V7z" />
      <path d="M2 12h20" />
      <path d="M8 12V9a2 2 0 0 1 4 0v3" />
    </svg>
  );
}

function IcBain() {
  return (
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 12h16" />
      <path d="M4 12v4a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-4" />
      <path d="M6 12V6a2 2 0 0 1 4 0" />
    </svg>
  );
}

function IcCamera() {
  return (
    <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function IcVerif() {
  return (
    <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ── Placeholder photo ─────────────────────────────────────────────────────────

function PlaceholderPhoto() {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center gap-2"
      style={{
        background: "linear-gradient(145deg, #0F4C3A 0%, #146C43 60%, #1a7a50 100%)",
      }}
    >
      <svg width="34" height="34" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.28)" strokeWidth="1.2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
      <span className="text-xs tracking-wide" style={{ color: "rgba(255,255,255,0.28)" }}>
        Aucune photo
      </span>
    </div>
  );
}

// ── Composant ─────────────────────────────────────────────────────────────────

export default function CarteAnnonce({ bien }: { bien: Bien }) {
  const [favori, setFavori] = useState(false);
  const { biens: biensCompares, ajouter, supprimer, estSelectionne } = useComparateur();
  const selectionne = estSelectionne(bien.id);
  const maxAtteint = !selectionne && biensCompares.length >= 4;

  const nbPhotos = bien.photos?.length ?? 0;
  const chemin = cheminBien(bien);
  const prixBase = bien.prix.toLocaleString("fr-FR");

  function toggleComparateur(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (selectionne) {
      supprimer(bien.id);
    } else if (!maxAtteint) {
      ajouter({
        id: bien.id,
        titre: bien.titre,
        photo: bien.photos?.[0] ?? null,
        prix: bien.prix,
        transaction: bien.transaction,
        slug: bien.slug ?? bien.id,
      });
    }
  }

  return (
    <article
      className="group relative rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_56px_rgba(15,76,58,0.15)]"
      style={{
        background: "var(--fond-secondaire)",
        border: "1px solid #EDE7D7",
        boxShadow: "0 2px 16px rgba(15,76,58,0.07)",
      }}
    >
      <Link
        href={chemin}
        onClick={() => { void trackEvenement(bien.id, "clic"); }}
        className="flex flex-col flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C3A] focus-visible:ring-offset-2 rounded-2xl"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        {/* ── Section photo ───────────────────────────────────────────── */}
        <div className="relative overflow-hidden" style={{ aspectRatio: "4 / 3" }}>

          {bien.photos?.[0] ? (
            <img
              src={bien.photos[0]}
              alt={`${bien.titre} — ${bien.ville}`}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
              loading="lazy"
            />
          ) : (
            <PlaceholderPhoto />
          )}

          {/* Voile dégradé bas au hover */}
          <div
            className="absolute inset-0 transition-opacity duration-300 opacity-0 group-hover:opacity-100 pointer-events-none"
            style={{ background: "linear-gradient(to top, rgba(15,76,58,0.25) 0%, transparent 55%)" }}
          />

          {/* ── Badges gauche ── */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full w-fit leading-none"
              style={
                bien.transaction === "location"
                  ? { background: "var(--accent)", color: "var(--primaire)" }
                  : { background: "var(--primaire)", color: "var(--fond-secondaire)" }
              }
            >
              {bien.transaction === "location" ? "À louer" : "À vendre"}
            </span>

            {bien.verifie && (
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full w-fit flex items-center gap-1 leading-none"
                style={{
                  background: "rgba(255,255,255,0.93)",
                  color: "var(--primaire-clair)",
                  backdropFilter: "blur(6px)",
                }}
              >
                <IcVerif />
                Vérifié
              </span>
            )}
          </div>

          {/* ── Compteur photos ── */}
          {nbPhotos > 1 && (
            <div
              className="absolute bottom-3 left-3 flex items-center gap-1 text-xs px-2 py-1 rounded-full pointer-events-none"
              style={{ background: "rgba(0,0,0,0.48)", color: "var(--fond-secondaire)", backdropFilter: "blur(4px)" }}
            >
              <IcCamera />
              <span className="tabular-nums">{nbPhotos}</span>
            </div>
          )}

        </div>

        {/* ── Section contenu ─────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 px-5 pt-4 pb-4">

          {/* Prix */}
          <div className="flex items-baseline gap-1 mb-2.5">
            <span
              className="leading-tight"
              style={{
                fontFamily: "var(--font-marcellus), serif",
                color: "var(--primaire)",
                fontSize: "1.2rem",
              }}
            >
              {prixBase}
            </span>
            <span className="text-sm font-medium" style={{ color: "var(--primaire)" }}>DH</span>
            {bien.transaction === "location" && (
              <span className="text-xs ml-0.5" style={{ color: "var(--texte-tertiaire)" }}>/mois</span>
            )}
          </div>

          {/* Titre */}
          <p
            className="text-sm font-medium leading-snug line-clamp-2 mb-2.5"
            style={{ color: "var(--texte-principal)" }}
          >
            {bien.titre}
          </p>

          {/* Localisation */}
          <p className="flex items-center gap-1.5 text-xs mb-4" style={{ color: "var(--texte-secondaire)" }}>
            <IcPin />
            <span className="truncate">
              {bien.quartier ? `${bien.quartier}, ` : ""}{bien.ville}
            </span>
          </p>

          {/* Séparateur */}
          <div style={{ height: 1, background: "var(--bordure-legere)", marginBottom: 12 }} />

          {/* Specs + référence */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5 text-xs" style={{ color: "var(--texte-secondaire)" }}>
              <span className="flex items-center gap-1">
                <IcSurface />
                {bien.surface}&thinsp;m²
              </span>
              <span className="flex items-center gap-1">
                <IcChambre />
                {bien.chambres}&thinsp;ch.
              </span>
              <span className="flex items-center gap-1">
                <IcBain />
                {bien.salles_bain}&thinsp;sdb
              </span>
            </div>

            {bien.reference && (
              <span
                className="text-xs tabular-nums flex-shrink-0 ml-2"
                style={{ color: "var(--texte-pale)", fontFamily: "ui-monospace, monospace" }}
              >
                {bien.reference}
              </span>
            )}
          </div>

        </div>
      </Link>

      {/* ── Toggle comparaison (hors du Link, bas de carte) ── */}
      <button
        type="button"
        onClick={toggleComparateur}
        disabled={maxAtteint}
        title={
          selectionne
            ? "Retirer de la comparaison"
            : maxAtteint
            ? "Maximum 4 biens atteint"
            : "Ajouter à la comparaison"
        }
        className="w-full flex items-center gap-2 px-5 py-2.5 text-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
        style={{
          borderTop: "1px solid #F0EDE5",
          background: selectionne ? "var(--fond-vert-leger)" : "transparent",
          color: selectionne ? "var(--primaire-clair)" : maxAtteint ? "var(--texte-pale)" : "var(--texte-tertiaire)",
          textAlign: "left",
        }}
      >
        {/* Checkbox visuelle */}
        <span
          style={{
            width: 15,
            height: 15,
            borderRadius: 4,
            border: `1.5px solid ${selectionne ? "var(--primaire-clair)" : "var(--texte-pale)"}`,
            background: selectionne ? "var(--primaire-clair)" : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.15s",
          }}
        >
          {selectionne && (
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--fond-secondaire)" strokeWidth="3.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
        <span style={{ fontWeight: selectionne ? 600 : 400 }}>
          {selectionne ? "Sélectionné pour comparer" : maxAtteint ? "Maximum 4 biens" : "Comparer"}
        </span>
      </button>

      {/* ── Bouton cœur (hors du Link, z-index élevé) ── */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setFavori((f) => !f);
        }}
        aria-label={favori ? "Retirer des favoris" : "Ajouter aux favoris"}
        aria-pressed={favori}
        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110"
        style={{
          background: favori ? "rgba(212,175,55,0.18)" : "rgba(255,255,255,0.90)",
          boxShadow: "0 1px 8px rgba(0,0,0,0.14)",
          backdropFilter: "blur(6px)",
          outline: favori ? "1.5px solid rgba(212,175,55,0.4)" : "none",
        }}
      >
        <IcCoeur plein={favori} />
      </button>

    </article>
  );
}
