"use client";

// Panneau carte des listes /acheter et /louer.
// - Fermé par défaut : mapbox-gl n'est PAS téléchargé (dynamic import au 1er clic).
// - Desktop : panneau latéral ~40 %, la liste se réorganise à gauche.
// - Mobile : bouton flottant « Carte » → vue plein écran, retour simple.
// - Ne reçoit que des points floutés (PointCarte) — jamais de coordonnées exactes.

import { useState } from "react";
import dynamic from "next/dynamic";
import type { PointCarte } from "@/lib/types";

const CarteBiens = dynamic(() => import("./CarteBiens"), {
  ssr: false,
  // Le fallback est transparent : l'aperçu statique placé derrière reste visible
  loading: () => null,
});

// Aperçu Mapbox Static affiché instantanément pendant le téléchargement du
// chunk mapbox-gl (une simple <img>, ~30 Ko, uniquement à l'ouverture).
function ApercuCarteStatique({ points }: { points: PointCarte[] }) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token || points.length === 0) return null;

  const lats = points.map((p) => p.latApprox);
  const lngs = points.map((p) => p.lngApprox);
  const lat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const lng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  // Zoom approché depuis l'étendue des points (clampé ville ↔ pays)
  const span = Math.max(
    Math.max(...lats) - Math.min(...lats),
    (Math.max(...lngs) - Math.min(...lngs)) * Math.cos((lat * Math.PI) / 180),
    0.005
  );
  const zoom = Math.min(12, Math.max(4.5, Math.log2(360 / span) - 2.2));

  const url =
    `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/` +
    `${lng.toFixed(4)},${lat.toFixed(4)},${zoom.toFixed(1)},0/640x960@2x` +
    `?access_token=${token}&logo=false&attribution=false`;

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
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

type Props = { points: PointCarte[]; children: React.ReactNode };

export default function VueListeCarte({ points, children }: Props) {
  const [ouverte, setOuverte] = useState(false);       // panneau desktop
  const [pleinEcran, setPleinEcran] = useState(false); // vue mobile

  const nb = points.length;

  // Aucun bien géolocalisable → liste seule, aucun bouton carte
  if (nb === 0) return <>{children}</>;

  return (
    <>
      {/* ── Bouton desktop — au-dessus de la liste ────────────────────────── */}
      <div className="hidden lg:block">
        <div className="max-w-6xl mx-auto px-6 pt-6 -mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setOuverte((o) => !o)}
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl cursor-pointer transition-all hover:shadow-md hover:-translate-y-px"
            style={
              ouverte
                ? { background: "var(--fond-vert-leger)", color: "var(--primaire)", border: "1.5px solid var(--primaire)" }
                : { background: "var(--primaire)", color: "#fff", border: "1.5px solid var(--primaire)" }
            }
          >
            <IcCarte />
            {ouverte ? "Masquer la carte" : `Afficher la carte (${nb})`}
          </button>
        </div>
      </div>

      {/* ── Liste + panneau desktop ───────────────────────────────────────── */}
      <div className="lg:flex lg:items-start">
        {/* La liste passe en 2 colonnes quand le panneau est ouvert */}
        <div
          className={`min-w-0 transition-all duration-500 ease-in-out ${
            ouverte ? "lg:w-[60%] [&_.grille-annonces]:lg:!grid-cols-2" : "w-full"
          }`}
        >
          {children}
        </div>

        {ouverte && (
          <aside
            className="hidden lg:block flex-1 sticky"
            style={{ top: 72, height: "calc(100vh - 72px)", animation: "hoomy-carte-in 0.45s ease" }}
          >
            <div
              className="relative w-full h-full overflow-hidden"
              style={{ borderLeft: "1px solid var(--bordure-legere)", background: "#EDF3EF" }}
            >
              <ApercuCarteStatique points={points} />
              <div className="absolute inset-0">
                <CarteBiens points={points} />
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ── Bouton flottant mobile ────────────────────────────────────────── */}
      {!pleinEcran && (
        <button
          type="button"
          onClick={() => setPleinEcran(true)}
          className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 text-sm font-semibold px-5 py-3 rounded-full cursor-pointer"
          style={{ background: "var(--primaire)", color: "#fff", boxShadow: "0 8px 28px rgba(15,76,58,0.35)" }}
        >
          <IcCarte />
          Carte ({nb})
        </button>
      )}

      {/* ── Vue carte plein écran mobile ──────────────────────────────────── */}
      {pleinEcran && (
        <div className="lg:hidden fixed inset-0" style={{ zIndex: 10002, background: "#EDF3EF" }}>
          <ApercuCarteStatique points={points} />
          <div className="absolute inset-0">
            <CarteBiens points={points} />
          </div>
          <button
            type="button"
            onClick={() => setPleinEcran(false)}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 text-sm font-semibold px-5 py-3 rounded-full cursor-pointer"
            style={{ background: "#fff", color: "var(--primaire)", boxShadow: "0 8px 28px rgba(0,0,0,0.25)", zIndex: 10003 }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Retour à la liste
          </button>
        </div>
      )}

      <style jsx global>{`
        @keyframes hoomy-carte-in {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
