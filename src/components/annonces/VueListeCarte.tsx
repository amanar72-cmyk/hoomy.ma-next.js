"use client";

// Vue liste ↔ carte des pages /acheter et /louer, pilotée par l'URL (?view=map).
// - Vue liste : bannière d'aperçu (image statique) avec bouton « Voir sur la carte ».
//   Mapbox-gl N'EST PAS téléchargé (dynamic import uniquement en vue carte).
// - Vue carte : carte interactive plein écran + bouton flottant « Voir en liste ».
// - L'URL conserve tous les filtres actifs → cohérence liste ↔ carte.
// - Ne reçoit que des points FLOUTÉS (PointCarte), jamais de coordonnées exactes.

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import type { PointCarte } from "@/lib/types";

const CarteBiens = dynamic(() => import("./CarteBiens"), {
  ssr: false,
  loading: () => null, // l'aperçu statique placé derrière reste visible
});

// URL d'une image Mapbox Static couvrant la zone des biens (aperçu instantané,
// ~30 Ko) — pas de mapbox-gl. `dim` = "LxH" (Mapbox ajoute @2x).
function urlStatique(points: PointCarte[], dim: string): string | null {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token || points.length === 0) return null;

  const lats = points.map((p) => p.latApprox);
  const lngs = points.map((p) => p.lngApprox);
  const lat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const lng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const span = Math.max(
    Math.max(...lats) - Math.min(...lats),
    (Math.max(...lngs) - Math.min(...lngs)) * Math.cos((lat * Math.PI) / 180),
    0.005
  );
  const zoom = Math.min(12, Math.max(4.5, Math.log2(360 / span) - 2.2));

  return (
    `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/` +
    `${lng.toFixed(4)},${lat.toFixed(4)},${zoom.toFixed(1)},0/${dim}@2x` +
    `?access_token=${token}&logo=false&attribution=false`
  );
}

function ApercuStatique({ points, dim }: { points: PointCarte[]; dim: string }) {
  const url = urlStatique(points, dim);
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      aria-hidden="true"
      className="absolute inset-0 w-full h-full object-cover"
      style={{ filter: "saturate(0.9)" }}
    />
  );
}

function IcCarte() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

type Props = { points: PointCarte[]; children: React.ReactNode };

export default function VueListeCarte({ points, children }: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const estCarte = searchParams.get("view") === "map";
  const nb = points.length;

  // Panneau coulissant ouvert → on masque le bouton « Voir en liste »
  const [feuilleOuverte, setFeuilleOuverte] = useState(false);

  // Bascule liste ↔ carte via l'URL, sans rechargement complet, filtres conservés
  function allerVue(vue: "map" | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (vue) params.set("view", vue);
    else params.delete("view");
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  // Verrou du scroll de la page derrière la carte plein écran
  useEffect(() => {
    if (!estCarte) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [estCarte]);

  // Aucun bien géolocalisable → liste seule, pas de bannière carte
  if (nb === 0) return <>{children}</>;

  // ── Vue carte plein écran ─────────────────────────────────────────────────
  if (estCarte) {
    return (
      <div className="fixed inset-0" style={{ zIndex: 10002, background: "#EDF3EF" }}>
        <ApercuStatique points={points} dim="800x1000" />
        <div className="absolute inset-0">
          <CarteBiens points={points} onFeuille={setFeuilleOuverte} />
        </div>
        <button
          type="button"
          onClick={() => allerVue(null)}
          aria-label="Revenir à la liste des biens"
          aria-hidden={feuilleOuverte}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-full cursor-pointer transition-opacity"
          style={{
            background: "#fff", color: "var(--primaire)",
            boxShadow: "0 8px 28px rgba(0,0,0,0.28)", zIndex: 10003,
            opacity: feuilleOuverte ? 0 : 1,
            pointerEvents: feuilleOuverte ? "none" : "auto",
          }}
        >
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
            <circle cx="3.5" cy="6" r="1" /><circle cx="3.5" cy="12" r="1" /><circle cx="3.5" cy="18" r="1" />
          </svg>
          Voir en liste
        </button>
      </div>
    );
  }

  // ── Vue liste : bannière d'aperçu + liste ─────────────────────────────────
  return (
    <>
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <button
          type="button"
          onClick={() => allerVue("map")}
          aria-label={`Voir les ${nb} biens sur la carte`}
          className="relative block w-full overflow-hidden rounded-2xl cursor-pointer group"
          style={{ height: 170, border: "1px solid var(--bordure-legere)", background: "#EDF3EF" }}
        >
          <ApercuStatique points={points} dim="1000x300" />
          {/* Voile pour la lisibilité du bouton central */}
          <div className="absolute inset-0" style={{ background: "rgba(10,30,20,0.28)" }} />
          <span
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-full transition-transform group-hover:scale-105"
            style={{ background: "var(--primaire)", color: "#fff", boxShadow: "0 8px 28px rgba(15,76,58,0.35)" }}
          >
            <IcCarte />
            Voir sur la carte ({nb})
          </span>
        </button>
      </div>

      {children}
    </>
  );
}
