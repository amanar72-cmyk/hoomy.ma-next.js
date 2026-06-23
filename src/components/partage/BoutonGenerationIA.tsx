"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  type: string;
  transaction: string;
  ville: string;
  quartier: string;
  prix: string;
  surface: string;
  chambres: string;
  sallesBain: string;
  equipements: string[];
  onGenere: (fr: string) => void;
};

// ─── Icône étincelle ──────────────────────────────────────────────────────────

function IcEtincelle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L9 9H2l5.5 4L5 20l7-5 7 5-2.5-7L22 9h-7L12 2z"/>
    </svg>
  );
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function BoutonGenerationIA({
  type, transaction, ville, quartier, prix, surface, chambres, sallesBain, equipements, onGenere,
}: Props) {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const champsPrioritairesManquants = !ville || !type;

  async function generer() {
    if (champsPrioritairesManquants) {
      setErreur("Remplissez d'abord le type de bien et la ville.");
      return;
    }
    setErreur(null);
    setEnCours(true);

    try {
      const res = await fetch("/api/generer-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          transaction,
          ville,
          quartier,
          prix,
          surface,
          chambres,
          salles_bain: sallesBain,
          equipements,
        }),
      });

      const data = await res.json() as { description_fr?: string; erreur?: string };

      if (!res.ok || data.erreur) {
        setErreur(data.erreur ?? "Erreur lors de la génération.");
        return;
      }

      if (data.description_fr) {
        onGenere(data.description_fr);
        setErreur(null);
      }
    } catch {
      setErreur("Impossible de joindre le service IA. Vérifiez votre connexion.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={generer}
        disabled={enCours}
        className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl self-start transition-all cursor-pointer disabled:opacity-60"
        style={{
          background: enCours
            ? "rgba(212,175,55,0.12)"
            : "linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.08) 100%)",
          color: "#A07C1E",
          border: "1px solid rgba(212,175,55,0.45)",
          boxShadow: enCours ? "none" : "0 1px 6px rgba(212,175,55,0.12)",
        }}
      >
        {enCours ? (
          <>
            <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            L'IA rédige les descriptions…
          </>
        ) : (
          <>
            <IcEtincelle />
            Générer avec l'IA
          </>
        )}
      </button>

      {erreur && (
        <p className="text-xs" style={{ color: "#DC2626" }}>
          {erreur}
        </p>
      )}
    </div>
  );
}
