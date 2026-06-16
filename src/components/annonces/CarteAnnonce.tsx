"use client";

import { useState } from "react";
import Link from "next/link";
import type { Bien } from "@/lib/types";

function formatPrix(prix: number, transaction: string) {
  return `${prix.toLocaleString("fr-FR")} DH${transaction === "location" ? "/mois" : ""}`;
}

function cheminBien(bien: Bien) {
  const action = bien.transaction === "location" ? "louer" : "acheter";
  return `/${action}/${bien.slug ?? bien.id}`;
}

function IconMaison() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#C2BBA3" strokeWidth="1.4">
      <path d="M3 11L12 4l9 7M5 9.5V20h14V9.5" />
    </svg>
  );
}

function IconCoeur({ plein }: { plein: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24"
      fill={plein ? "#D4AF37" : "none"}
      stroke={plein ? "#D4AF37" : "#999"}
      strokeWidth="2"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export default function CarteAnnonce({ bien }: { bien: Bien }) {
  const [favori, setFavori] = useState(false);

  return (
    <div
      className="rounded-2xl overflow-hidden border transition-all duration-200 hover:shadow-xl hover:-translate-y-1"
      style={{ background: "#fff", borderColor: "#E8E2D2" }}
    >
      {/* ── Section photo ── */}
      <div className="relative h-52 overflow-hidden" style={{ background: "#EDE7D7" }}>

        {/* Photo cliquable */}
        <Link href={cheminBien(bien)} className="block h-full" style={{ textDecoration: "none" }}>
          {bien.photos?.[0] ? (
            <img
              src={bien.photos[0]}
              alt={bien.titre}
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <IconMaison />
              <span className="text-xs" style={{ color: "#C2BBA3" }}>Pas de photo</span>
            </div>
          )}
        </Link>

        {/* Badges empilés en haut à gauche */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          <span
            className="text-xs px-2.5 py-1 rounded font-medium w-fit"
            style={
              bien.transaction === "location"
                ? { background: "#D4AF37", color: "#0F4C3A" }
                : { background: "#146C43", color: "#fff" }
            }
          >
            {bien.transaction === "location" ? "À louer" : "À vendre"}
          </span>

          {bien.verifie && (
            <span
              className="text-xs px-2.5 py-1 rounded border w-fit"
              style={{ background: "#fff", color: "#146C43", borderColor: "#146C43" }}
            >
              ✓ Vérifié
            </span>
          )}
        </div>

        {/* Bouton cœur favoris — hors du <Link> pour éviter button dans anchor */}
        <button
          onClick={() => setFavori((f) => !f)}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow transition-transform hover:scale-110 cursor-pointer"
          style={{ background: "#fff" }}
          aria-label={favori ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          <IconCoeur plein={favori} />
        </button>

      </div>

      {/* ── Section contenu (entier cliquable) ── */}
      <Link
        href={cheminBien(bien)}
        className="block p-4"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        {/* Référence */}
        {bien.reference && (
          <p className="text-xs mb-1.5" style={{ color: "#B4AD97" }}>
            {bien.reference}
          </p>
        )}

        {/* Titre */}
        <p
          className="text-base mb-1.5 leading-snug line-clamp-2"
          style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}
        >
          {bien.titre}
        </p>

        {/* Prix */}
        <p className="text-xl font-semibold mb-2" style={{ color: "#0F4C3A" }}>
          {formatPrix(bien.prix, bien.transaction)}
        </p>

        {/* Ville + quartier */}
        <p className="flex items-center gap-1 text-sm mb-3" style={{ color: "#666" }}>
          <span aria-hidden="true">📍</span>
          <span>{bien.quartier ? `${bien.quartier}, ` : ""}{bien.ville}</span>
        </p>

        {/* Caractéristiques */}
        <div
          className="flex items-center gap-4 text-xs pt-3 border-t"
          style={{ color: "#666", borderColor: "#EEE8D8" }}
        >
          <span>{bien.surface} m²</span>
          <span><span aria-hidden="true">🛏</span> {bien.chambres}</span>
          <span><span aria-hidden="true">🚿</span> {bien.salles_bain}</span>
        </div>
      </Link>
    </div>
  );
}
