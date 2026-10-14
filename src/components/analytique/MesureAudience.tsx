"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { detecterSource, type SourceAudience } from "@/lib/mesure/source";

/**
 * Mesure d'audience interne SANS cookie, monté sur le site public uniquement
 * (voir mesure_audience.sql et /api/mesure).
 *
 * Indépendant du bandeau de consentement : aucun cookie, aucun stockage
 * navigateur, aucun identifiant. Chaque page vue envoie seulement son chemin,
 * la source de l'arrivée et un drapeau « entrée » (1re page après un
 * chargement complet). La source et le drapeau vivent en mémoire (useRef) et
 * disparaissent avec l'onglet.
 *
 * Volontairement sans useSearchParams : seul le chemin compte, ce qui évite la
 * frontière Suspense et les doubles envois quand seuls les filtres changent.
 */
export default function MesureAudience() {
  const pathname = usePathname();
  const source = useRef<SourceAudience | null>(null);
  const dernierChemin = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith("/pro") || pathname.startsWith("/admin")) return;
    // Anti-doublon (re-rendu, Strict Mode en dev)
    if (dernierChemin.current === pathname) return;

    const entree = source.current === null;
    if (entree) {
      source.current = detecterSource(new URL(window.location.href), document.referrer);
    }
    dernierChemin.current = pathname;

    const corps = JSON.stringify({ chemin: pathname, source: source.current, entree });
    try {
      // sendBeacon survit à la fermeture de l'onglet et ne bloque rien.
      if (!navigator.sendBeacon?.("/api/mesure", corps)) {
        void fetch("/api/mesure", { method: "POST", body: corps, keepalive: true });
      }
    } catch {
      // jamais bloquant
    }
  }, [pathname]);

  return null;
}
