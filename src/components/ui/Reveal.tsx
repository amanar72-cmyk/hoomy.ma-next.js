"use client";

// Révélations au scroll pilotées par Framer Motion — plus riches que le simple
// fondu d'ApparitionScroll : direction au choix, cascade (stagger) des enfants,
// ressort doux. Réservé aux sections SOUS la ligne de flottaison (le Hero/LCP
// n'est jamais animé). Entièrement neutralisé sous prefers-reduced-motion.

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

type Direction = "haut" | "gauche" | "droite";

function offset(direction: Direction, d: number) {
  if (direction === "gauche") return { x: -d, y: 0 };
  if (direction === "droite") return { x: d, y: 0 };
  return { x: 0, y: d };
}

// ── Révélation simple d'un bloc ──────────────────────────────────────────────
export function Reveal({
  children,
  direction = "haut",
  distance = 28,
  delay = 0,
  className,
}: {
  children: ReactNode;
  direction?: Direction;
  distance?: number;
  delay?: number;
  className?: string;
}) {
  const reduit = useReducedMotion();
  if (reduit) return <div className={className}>{children}</div>;

  const o = offset(direction, distance);
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...o }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

// ── Cascade : le conteneur révèle ses <RevealItem> en escalier ───────────────
const conteneur: Variants = {
  cache: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const element: Variants = {
  cache: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export function RevealCascade({ children, className }: { children: ReactNode; className?: string }) {
  const reduit = useReducedMotion();
  if (reduit) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={conteneur}
      initial="cache"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduit = useReducedMotion();
  if (reduit) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={element}>
      {children}
    </motion.div>
  );
}
