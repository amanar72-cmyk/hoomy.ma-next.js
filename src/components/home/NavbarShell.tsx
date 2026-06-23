"use client";

import { useState, useEffect, useRef } from "react";

// Wrapper client pour la navbar : masque la barre quand on défile,
// la réaffiche uniquement quand on revient tout en haut (scrollY < SEUIL).
// Optimisé via requestAnimationFrame — un seul calcul par frame de rendu.

const SEUIL_PX = 16; // pixels depuis le haut sous lesquels la navbar est visible

export default function NavbarShell({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(true);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      // Throttle via rAF : on ne calcule qu'une fois par frame
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        setVisible(window.scrollY < SEUIL_PX);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // Sync initial (au cas où la page est chargée avec un scroll existant)
    setVisible(window.scrollY < SEUIL_PX);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        // Légèrement plus de -100% pour cacher aussi l'ombre portée
        transform: visible ? "translateY(0)" : "translateY(-110%)",
        transition: "transform 260ms cubic-bezier(0.4, 0, 0.2, 1)",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}
