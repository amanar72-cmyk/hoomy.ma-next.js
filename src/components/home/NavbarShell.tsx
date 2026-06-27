"use client";

import { useState, useEffect, useRef } from "react";

// Wrapper client pour la navbar :
// - Cache la barre quand on défile vers le bas.
// - La réaffiche si la souris approche du haut de l'écran (< ZONE_SURVOL px).
// - Sur mobile (pas d'événement mousemove), le comportement reste uniquement scroll.

const SEUIL_SCROLL = 16;  // px — visible si scrollY inférieur à cette valeur
const ZONE_SURVOL  = 55;  // px depuis le haut déclenchant la réapparition au survol

export default function NavbarShell({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(true);
  const scrollYRef    = useRef(0);
  const sourisHautRef = useRef(false);
  const rafRef        = useRef<number | null>(null);

  useEffect(() => {
    const recalculer = () => {
      setVisible(scrollYRef.current < SEUIL_SCROLL || sourisHautRef.current);
    };

    const handleScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        scrollYRef.current = window.scrollY;
        recalculer();
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      const etaitHaut = sourisHautRef.current;
      sourisHautRef.current = e.clientY < ZONE_SURVOL;
      // Ne redéclenche un rendu que si l'état a changé
      if (etaitHaut !== sourisHautRef.current) recalculer();
    };

    // Sync initial
    scrollYRef.current = window.scrollY;
    recalculer();

    window.addEventListener("scroll",    handleScroll,    { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener("scroll",    handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        transform: visible ? "translateY(0)" : "translateY(-110%)",
        transition: "transform 260ms cubic-bezier(0.4, 0, 0.2, 1)",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}
