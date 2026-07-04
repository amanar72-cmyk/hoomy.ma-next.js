"use client";

// Grille des villes avec révélation échelonnée (stagger 40 ms) à l'entrée
// dans le viewport. IntersectionObserver natif, ~0 Ko. Désactivé proprement
// sous prefers-reduced-motion.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const VILLES = ["Casablanca", "Marrakech", "Rabat", "Tanger", "Agadir", "Fès"] as const;

function formaterAnnonces(n: number): string {
  if (n === 0) return "Bientôt disponible";
  if (n === 1) return "1 annonce";
  return `${n.toLocaleString("fr-FR")} annonces`;
}

export default function VillesGrille({ comptesParVille }: { comptesParVille: Record<string, number> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [enVue, setEnVue] = useState(false);
  const [motionReduit, setMotionReduit] = useState(false);

  useEffect(() => {
    setMotionReduit(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setEnVue(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const revele = enVue || motionReduit;

  return (
    <div ref={ref} className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {VILLES.map((nom, i) => {
        const count = comptesParVille[nom] ?? 0;
        return (
          <Link
            key={nom}
            href={`/acheter?ville=${nom}`}
            className="relative overflow-hidden rounded-2xl h-40 flex flex-col justify-end p-5 transition-transform hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, #0F4C3A 0%, #146C43 100%)",
              textDecoration: "none",
              opacity: revele ? 1 : 0,
              transform: revele ? "none" : "translateY(14px)",
              transition: motionReduit
                ? "transform 0.2s ease"
                : "opacity 0.5s ease, transform 0.5s ease",
              transitionDelay: motionReduit ? "0ms" : `${i * 40}ms`,
            }}
          >
            {/* Motif décoratif */}
            <div
              className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #D4AF37 0%, transparent 60%)" }}
            />
            <p
              className="relative text-xl font-normal"
              style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--fond-secondaire)" }}
            >
              {nom}
            </p>
            <p className="relative text-xs mt-1" style={{ color: "var(--accent)" }}>
              {formaterAnnonces(count)}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
