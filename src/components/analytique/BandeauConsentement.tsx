"use client";

import Link from "next/link";
import type { Consentement } from "@/lib/consentement";

interface Props {
  onChoix: (valeur: Consentement) => void;
}

export default function BandeauConsentement({ onChoix }: Props) {
  return (
    <div
      role="dialog"
      aria-label="Mesure d'audience"
      // Bas-gauche plutôt que pleine largeur : laisse la bulle de chat libre en
      // bas à droite sur desktop. Sur mobile, le bandeau passe au-dessus d'elle.
      className="fixed bottom-24 left-4 right-4 sm:bottom-4 sm:right-auto sm:max-w-[420px]"
      style={{
        zIndex: 9990, // au-dessus de la barre comparateur (50), sous le splash (9999)
        background: "var(--fond-secondaire)",
        border: "1px solid var(--bordure)",
        borderRadius: "14px",
        padding: "1.25rem",
        boxShadow: "0 8px 30px rgba(15, 76, 58, 0.13)",
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-marcellus), serif",
          fontSize: "1.05rem",
          color: "var(--texte-principal)",
          margin: "0 0 0.4rem",
        }}
      >
        Cookies de mesure d&apos;audience
      </h2>

      <p
        style={{
          fontSize: "0.875rem",
          lineHeight: 1.55,
          color: "var(--texte-corps)",
          margin: "0 0 1rem",
        }}
      >
        Nous aimerions mesurer l&apos;audience du site pour comprendre les pages qui vous
        sont utiles et améliorer HOOMY. Rien n&apos;est déposé sans votre accord, et refuser
        ne change rien à votre navigation.{" "}
        <Link
          href="/confidentialite"
          style={{ color: "var(--texte-chaud)", textDecoration: "underline" }}
        >
          En savoir plus
        </Link>
      </p>

      {/* Deux boutons de même poids visuel : le refus doit être aussi simple que l'accord. */}
      <div style={{ display: "flex", gap: "0.6rem" }}>
        <button
          type="button"
          onClick={() => onChoix("accepte")}
          style={{
            flex: 1,
            padding: "0.6rem 1rem",
            borderRadius: "8px",
            border: "1px solid var(--accent)",
            background: "var(--accent)",
            color: "var(--texte-sur-accent)",
            fontFamily: "var(--font-outfit), sans-serif",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Accepter
        </button>

        <button
          type="button"
          onClick={() => onChoix("refuse")}
          style={{
            flex: 1,
            padding: "0.6rem 1rem",
            borderRadius: "8px",
            border: "1px solid var(--bordure-action)",
            background: "transparent",
            color: "var(--bordure-action)",
            fontFamily: "var(--font-outfit), sans-serif",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Refuser
        </button>
      </div>
    </div>
  );
}
