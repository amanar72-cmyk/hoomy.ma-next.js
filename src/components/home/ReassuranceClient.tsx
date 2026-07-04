"use client";

// Partie interactive de « Pourquoi choisir HOOMY » :
//  - compteurs de stats RÉELLES animés au premier passage dans le viewport
//    (quartiers couverts, villes) — rAF + IntersectionObserver, ~0 Ko de dépendance
//  - révélation échelonnée (stagger 40 ms) des 3 piliers de confiance
// Tout se désactive proprement sous prefers-reduced-motion.

import { useEffect, useRef, useState } from "react";

// ── Icônes ────────────────────────────────────────────────────────────────────

function IconVerifie() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconConseillers() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function IconSecurise() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

const POINTS = [
  { Icone: IconVerifie, titre: "Annonces Vérifiées", description: "Chaque bien est contrôlé par notre équipe terrain. Zéro fausse annonce, photos authentiques et informations exactes." },
  { Icone: IconConseillers, titre: "Conseillers Experts", description: "Des professionnels immobiliers dédiés à votre projet, disponibles 6j/7 pour vous guider de A à Z." },
  { Icone: IconSecurise, titre: "100% Sécurisé", description: "Transactions sécurisées, données protégées et processus conformes à la législation marocaine en vigueur." },
];

// ── Hook : déclenche une fois à l'entrée dans le viewport ─────────────────────

function useEnVue<T extends HTMLElement>(seuil = 0.25) {
  const ref = useRef<T>(null);
  const [enVue, setEnVue] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setEnVue(true); obs.disconnect(); } },
      { threshold: seuil }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [seuil]);
  return { ref, enVue };
}

// ── Compteur animé ────────────────────────────────────────────────────────────

function Compteur({ valeur, actif }: { valeur: number; actif: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!actif) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(valeur); return; }
    const duree = 1200;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duree);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setN(Math.round(eased * valeur));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [actif, valeur]);
  return <>{n.toLocaleString("fr-FR")}</>;
}

// ── Composant ─────────────────────────────────────────────────────────────────

type Props = { nbQuartiers: number; nbVilles: number };

export default function ReassuranceClient({ nbQuartiers, nbVilles }: Props) {
  const stats = useEnVue<HTMLDivElement>(0.4);
  const piliers = useEnVue<HTMLDivElement>(0.2);

  // Motion réduit → pas d'entrée décalée, contenu affiché d'emblée
  const [motionReduit, setMotionReduit] = useState(false);
  useEffect(() => {
    setMotionReduit(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  const revele = piliers.enVue || motionReduit;

  // Un compteur n'est montré que si la valeur est avantageuse (sinon masqué,
  // à réactiver au remplissage des données).
  const statsVisibles = [
    nbQuartiers >= 50 ? { valeur: nbQuartiers, label: "quartiers couverts" } : null,
    nbVilles >= 4 ? { valeur: nbVilles, label: "grandes villes" } : null,
  ].filter((s): s is { valeur: number; label: string } => s !== null);

  return (
    <>
      {/* ── Bandeau de stats réelles ──────────────────────────────────────── */}
      {statsVisibles.length > 0 && (
        <div
          ref={stats.ref}
          className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 mb-14"
        >
          {statsVisibles.map((s) => (
            <div key={s.label} className="text-center">
              <p
                className="text-4xl md:text-5xl font-normal leading-none mb-1 tabular-nums"
                style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--accent)" }}
              >
                <Compteur valeur={s.valeur} actif={stats.enVue} />
              </p>
              <p className="text-xs uppercase tracking-wider" style={{ color: "var(--texte-tertiaire)", letterSpacing: "0.1em" }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── 3 piliers avec révélation échelonnée ──────────────────────────── */}
      <div ref={piliers.ref} className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {POINTS.map(({ Icone, titre, description }, i) => (
          <div
            key={titre}
            className="text-center"
            style={{
              opacity: revele ? 1 : 0,
              transform: revele ? "none" : "translateY(14px)",
              transition: motionReduit ? "none" : "opacity 0.5s ease, transform 0.5s ease",
              transitionDelay: motionReduit ? "0ms" : `${i * 40}ms`,
            }}
          >
            <div className="flex justify-center mb-6">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.25)" }}
              >
                <Icone />
              </div>
            </div>
            <h3
              className="text-xl font-normal mb-3"
              style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--fond-secondaire)" }}
            >
              {titre}
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--texte-tertiaire)" }}>
              {description}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
