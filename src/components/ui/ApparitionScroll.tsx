"use client";

// Apparition discrète au scroll : la section monte de 12 px en fondu à son
// entrée dans le viewport, une seule fois.
//
// Robustesse : le HTML serveur est rendu VISIBLE (SEO/LCP intacts, contenu
// lisible sans JS). Ce n'est qu'après hydratation, et uniquement pour les
// sections encore sous la ligne de flottaison, que l'élément est masqué puis
// animé. Respecte prefers-reduced-motion.

import { useEffect, useRef, useState } from "react";

type Props = { children: React.ReactNode; delaiMs?: number };

export default function ApparitionScroll({ children, delaiMs = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [masque, setMasque] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Déjà (partiellement) visible à l'arrivée → ne pas faire clignoter
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    setMasque(true);
    const observer = new IntersectionObserver(
      ([entree]) => {
        if (entree.isIntersecting) {
          setMasque(false);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: masque ? 0 : 1,
        transform: masque ? "translateY(12px)" : "none",
        transition: `opacity 0.6s ease ${delaiMs}ms, transform 0.6s ease ${delaiMs}ms`,
      }}
    >
      {children}
    </div>
  );
}
