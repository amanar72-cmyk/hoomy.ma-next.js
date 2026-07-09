"use client";

// Parcours propriétaire — timeline verticale de 5 étapes reliées par un FIL
// D'OR qui se remplit au fur et à mesure du défilement (IntersectionObserver).
// Chaque carte apparaît en fondu/glissement à son entrée dans le viewport ;
// à la dernière étape, un paraphe SVG se « dessine » (stroke-dashoffset).
// CSS uniquement (aucune dépendance d'animation). Sous prefers-reduced-motion,
// tout est visible et statique d'emblée. Couleurs via les tokens du thème
// (jour/nuit automatiques).

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ── Étapes (textes validés) ───────────────────────────────────────────────────
const ETAPES = [
  {
    titre: "Prise de contact",
    texte:
      "Décrivez votre bien en quelques minutes, en ligne ou par téléphone. Un conseiller dédié vous recontacte sous 24h.",
  },
  {
    titre: "Visite et expertise du bien",
    texte:
      "Votre conseiller se déplace, examine le bien dans le détail et étudie son environnement, ses atouts et son potentiel.",
  },
  {
    titre: "Estimation au juste prix",
    texte:
      "Vous recevez une estimation argumentée, fondée sur les ventes comparables et la réalité du marché de votre quartier.",
  },
  {
    titre: "Stratégie et proposition de mandat",
    texte:
      "Plan de mise en valeur, photos professionnelles, canaux de diffusion : nous vous proposons une stratégie claire, sans engagement.",
  },
  {
    titre: "Signature du mandat",
    texte:
      "Un mandat transparent, encadré par le droit marocain. Il ne reste qu'à signer : nous nous occupons de tout.",
  },
] as const;

// Longueur (approx.) du tracé du paraphe pour l'animation stroke-dashoffset
const LONGUEUR_PARAPHE = 340;

export default function ParcoursProprietaire() {
  // Nombre d'étapes déjà « franchies » (atteintes au scroll) — pilote le fil
  // d'or, l'état des pastilles et l'apparition des cartes.
  const [franchies, setFranchies] = useState(0);
  const etapesRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    // Motion réduit → tout visible immédiatement, fil rempli, paraphe dessiné
    // (setState différé d'une frame : jamais de setState synchrone dans l'effect)
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const raf = requestAnimationFrame(() => setFranchies(ETAPES.length));
      return () => cancelAnimationFrame(raf);
    }
    const obs = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) {
          if (!e.isIntersecting) continue;
          const i = Number((e.target as HTMLElement).dataset.etape ?? 0);
          setFranchies((f) => Math.max(f, i + 1));
          obs.unobserve(e.target);
        }
      },
      { threshold: 0.45, rootMargin: "0px 0px -8% 0px" }
    );
    etapesRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <section className="max-w-3xl mx-auto px-6 py-16 md:py-20">
      {/* ── En-tête ─────────────────────────────────────────────────────────── */}
      <div className="text-center mb-12">
        <p
          className="text-xs font-medium tracking-widest uppercase mb-3"
          style={{ color: "var(--accent)", letterSpacing: "0.14em" }}
        >
          Vous êtes propriétaire ?
        </p>
        <h2
          className="text-3xl font-normal mb-3"
          style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}
        >
          Le parcours propriétaire
        </h2>
        <p className="text-sm" style={{ color: "var(--texte-secondaire)" }}>
          De la prise de contact à la signature du mandat, un accompagnement clair et sans surprise.
        </p>
      </div>

      {/* ── Timeline ────────────────────────────────────────────────────────── */}
      <div className="relative">
        {/* Rail (fond) */}
        <div
          aria-hidden="true"
          className="absolute top-0 bottom-0"
          style={{ left: 19, width: 2, background: "var(--bordure)" }}
        />
        {/* Fil d'or : se remplit au scroll (scaleY GPU, origine en haut) */}
        <div
          aria-hidden="true"
          className="absolute top-0 bottom-0"
          style={{
            left: 19,
            width: 2,
            background: "linear-gradient(180deg, #E9C766, var(--accent))",
            transform: `scaleY(${franchies / ETAPES.length})`,
            transformOrigin: "top",
            transition: "transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
            boxShadow: "0 0 8px rgba(212,175,55,0.35)",
          }}
        />

        <ol className="space-y-10" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {ETAPES.map(({ titre, texte }, i) => {
            const atteinte = franchies > i;
            const derniere = i === ETAPES.length - 1;
            return (
              <li
                key={titre}
                data-etape={i}
                ref={(el) => { etapesRefs.current[i] = el; }}
                className="relative pl-16"
              >
                {/* Pastille numérotée sur le rail */}
                <span
                  aria-hidden="true"
                  className="absolute flex items-center justify-center text-sm font-semibold rounded-full"
                  style={{
                    left: 0,
                    top: 0,
                    width: 40,
                    height: 40,
                    background: atteinte ? "linear-gradient(135deg, #E9C766, var(--accent))" : "var(--fond-secondaire)",
                    color: atteinte ? "#0F4C3A" : "var(--texte-tertiaire)",
                    border: atteinte ? "1px solid rgba(212,175,55,0.6)" : "1px solid var(--bordure)",
                    boxShadow: atteinte ? "0 4px 14px rgba(212,175,55,0.35)" : "none",
                    transition: "background 0.45s ease, color 0.45s ease, box-shadow 0.45s ease, border-color 0.45s ease",
                  }}
                >
                  {i + 1}
                </span>

                {/* Carte de l'étape */}
                <div
                  className="rounded-2xl px-6 py-5"
                  style={{
                    background: "var(--fond-secondaire)",
                    border: "1px solid var(--bordure-legere)",
                    boxShadow: "0 2px 16px rgba(15,76,58,0.06)",
                    opacity: atteinte ? 1 : 0,
                    transform: atteinte ? "none" : "translateY(18px)",
                    transition: "opacity 0.55s ease, transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                >
                  <h3
                    className="text-lg font-normal mb-1.5"
                    style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}
                  >
                    {titre}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--texte-secondaire)" }}>
                    {texte}
                  </p>

                  {/* Paraphe qui se dessine à la dernière étape */}
                  {derniere && (
                    <svg
                      width="120"
                      height="46"
                      viewBox="0 0 120 46"
                      fill="none"
                      aria-hidden="true"
                      className="mt-3"
                    >
                      <path
                        d="M6 34 C 16 12, 28 8, 34 20 C 39 30, 30 38, 24 32 C 18 26, 32 14, 46 17 C 58 20, 60 30, 72 26 C 82 22, 86 28, 96 24 C 103 21, 108 24, 114 21"
                        stroke="var(--accent)"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        style={{
                          strokeDasharray: LONGUEUR_PARAPHE,
                          strokeDashoffset: atteinte ? 0 : LONGUEUR_PARAPHE,
                          transition: "stroke-dashoffset 1.2s ease 0.35s",
                        }}
                      />
                    </svg>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ── CTA finaux (l'estimation en ligne est masquée : parcours humain) ── */}
      <div className="mt-12 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
        <Link
          href="/publier"
          className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold transition-transform hover:scale-[1.02]"
          style={{
            background: "linear-gradient(135deg, #E9C766, var(--accent))",
            color: "#0F4C3A",
            textDecoration: "none",
            boxShadow: "0 4px 16px rgba(212,175,55,0.3)",
          }}
        >
          Déposer mon bien gratuitement
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
        <Link
          href="/#contact-conseiller"
          className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
          style={{
            border: "1.5px solid var(--bordure-action)",
            color: "var(--bordure-action)",
            textDecoration: "none",
          }}
        >
          Être rappelé par un conseiller
        </Link>
      </div>
    </section>
  );
}
