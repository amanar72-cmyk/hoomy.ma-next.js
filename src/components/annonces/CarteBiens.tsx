"use client";

// Carte Mapbox des listes /acheter et /louer.
// Chargée UNIQUEMENT via dynamic import à l'ouverture du panneau (0 Ko sinon).
// Ne reçoit que des coordonnées APPROXIMATIVES (floutées côté serveur) :
// cercles de zone, jamais de pin exact.

import "mapbox-gl/dist/mapbox-gl.css";
import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import MapGL, { Marker, Popup, NavigationControl, GeolocateControl } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import Link from "next/link";
import { formaterPrix } from "@/lib/format";
import type { PointCarte } from "@/lib/types";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// Prix compact pour la pilule du marqueur : « 3,2M DH », « 480K DH », « 5K DH/mois ».
function prixCourt(prix: number, transaction: string): string {
  let s: string;
  if (prix >= 1_000_000) {
    const m = Math.round((prix / 1_000_000) * 10) / 10;
    s = m.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + "M";
  } else if (prix >= 1000) {
    s = Math.round(prix / 1000) + "K";
  } else {
    s = String(prix);
  }
  return `${s} DH${transaction === "location" ? "/mois" : ""}`;
}

// Clustering léger côté client (zéro dépendance) : on projette chaque point
// flouté en pixels et on regroupe par cellules de CELL px. Recalculé à chaque
// fin de déplacement/zoom. Suffisant pour des dizaines à centaines de biens.
const CELL = 64;
type Amas = { key: string; lng: number; lat: number; count: number; point: PointCarte | null };

type Props = { points: PointCarte[] };

export default function CarteBiens({ points }: Props) {
  const mapRef = useRef<MapRef>(null);
  const conteneurRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<PointCarte | null>(null);
  // Fondu depuis l'aperçu statique une fois la carte interactive prête
  const [prete, setPrete] = useState(false);
  // Bascule Normal / Satellite
  const [satellite, setSatellite] = useState(false);
  const mapStyle = satellite
    ? "mapbox://styles/mapbox/satellite-streets-v12"
    : "mapbox://styles/mapbox/streets-v12";

  // Mapbox a besoin de dimensions stables : le canvas s'initialise parfois avant
  // que le panneau (flex-1 + animation d'ouverture) ait sa taille finale, d'où
  // une carte « déformée ». On force resize() dès que le conteneur est mesuré
  // puis à chaque changement de taille (ouverture desktop, plein écran mobile,
  // redimensionnement fenêtre). Le callback se déclenche aussi immédiatement à
  // l'observation → corrige la forme initiale.
  useEffect(() => {
    const el = conteneurRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Amas recalculés à chaque déplacement/zoom (et à l'arrivée des biens)
  const [amas, setAmas] = useState<Amas[]>([]);
  const recalculer = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const cellules = new Map<string, { slng: number; slat: number; count: number; premier: PointCarte }>();
    for (const p of points) {
      const px = map.project([p.lngApprox, p.latApprox]);
      const cle = `${Math.floor(px.x / CELL)}:${Math.floor(px.y / CELL)}`;
      const c = cellules.get(cle);
      if (c) { c.slng += p.lngApprox; c.slat += p.latApprox; c.count++; }
      else cellules.set(cle, { slng: p.lngApprox, slat: p.latApprox, count: 1, premier: p });
    }
    const out: Amas[] = [];
    for (const [cle, c] of cellules) {
      out.push({
        key: cle,
        lng: c.slng / c.count,
        lat: c.slat / c.count,
        count: c.count,
        point: c.count === 1 ? c.premier : null,
      });
    }
    setAmas(out);
  }, [points]);

  // Recalcule quand les biens changent (une fois la carte prête)
  useEffect(() => { recalculer(); }, [recalculer]);

  // Cadrage initial sur l'ensemble des biens
  const bounds = useMemo(() => {
    const lats = points.map((p) => p.latApprox);
    const lngs = points.map((p) => p.lngApprox);
    return [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ] as [[number, number], [number, number]];
  }, [points]);

  const cheminBien = (p: PointCarte) =>
    `/${p.transaction === "location" ? "louer" : "acheter"}/${p.slug ?? p.id}`;

  return (
    <div
      ref={conteneurRef}
      className="w-full h-full relative"
      style={{ opacity: prete ? 1 : 0, transition: "opacity 0.5s ease" }}
    >
    {/* Toggle Normal / Satellite — haut gauche, style HOOMY */}
    <button
      type="button"
      onClick={() => setSatellite((s) => !s)}
      aria-label={satellite ? "Vue plan" : "Vue satellite"}
      className="absolute z-10 top-3 left-3 text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer transition-all hover:shadow-md"
      style={{
        background: satellite ? "#0F4C3A" : "rgba(255,255,255,0.95)",
        color: satellite ? "#fff" : "#0F4C3A",
        border: "1px solid rgba(15,76,58,0.15)",
        boxShadow: "0 2px 10px rgba(15,76,58,0.15)",
        backdropFilter: "blur(6px)",
      }}
    >
      {satellite ? "Plan" : "Satellite"}
    </button>

    <MapGL
      ref={mapRef}
      mapboxAccessToken={TOKEN}
      mapStyle={mapStyle}
      initialViewState={{ bounds, fitBoundsOptions: { padding: 70, maxZoom: 14 } }}
      style={{ width: "100%", height: "100%" }}
      onLoad={() => { setPrete(true); mapRef.current?.resize(); recalculer(); }}
      onMoveEnd={recalculer}
      onClick={() => setSelection(null)}
      attributionControl={false}
    >
      <NavigationControl position="top-right" showCompass={false} />
      {/* Géolocalisation — « me centrer sur ma position » */}
      <GeolocateControl
        position="top-right"
        showAccuracyCircle={false}
        trackUserLocation={false}
        positionOptions={{ enableHighAccuracy: true }}
      />

      {/* Marqueurs : pilule de prix (bien seul) ou bulle de cluster.
          Positionnés sur les coordonnées FLOUTÉES — jamais la position exacte. */}
      {amas.map((a) =>
        a.count === 1 && a.point ? (
          <Marker
            key={a.key}
            longitude={a.lng}
            latitude={a.lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              const p = a.point!;
              setSelection(p);
              mapRef.current?.easeTo({
                center: [a.lng, a.lat],
                zoom: Math.max(mapRef.current.getZoom(), 13.5),
                duration: 450,
              });
            }}
          >
            <div
              className="pilule-prix"
              style={
                selection?.id === a.point.id
                  ? { background: "#D4AF37", color: "#0F4C3A" }
                  : { background: "#0F4C3A", color: "#fff" }
              }
            >
              {prixCourt(a.point.prix, a.point.transaction)}
            </div>
          </Marker>
        ) : (
          <Marker
            key={a.key}
            longitude={a.lng}
            latitude={a.lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              const map = mapRef.current;
              if (map) map.easeTo({ center: [a.lng, a.lat], zoom: map.getZoom() + 2, duration: 450 });
            }}
          >
            <div className="bulle-cluster">{a.count}</div>
          </Marker>
        )
      )}

      {/* Mini-carte du bien sélectionné */}
      {selection && (
        <Popup
          latitude={selection.latApprox}
          longitude={selection.lngApprox}
          anchor="bottom"
          offset={14}
          closeButton={false}
          onClose={() => setSelection(null)}
          maxWidth="240px"
          className="hoomy-popup-bien"
        >
          <Link
            href={cheminBien(selection)}
            style={{ textDecoration: "none", color: "inherit", display: "block", width: 220 }}
          >
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "#fff", boxShadow: "0 8px 28px rgba(15,76,58,0.18)" }}
            >
              <div style={{ height: 110, background: "#F4F6F5", overflow: "hidden" }}>
                {selection.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selection.photo}
                    alt={selection.titre}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="#C4D8CE" strokeWidth="1.2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="px-3 py-2.5">
                <p
                  className="text-sm font-semibold mb-0.5"
                  style={{ color: "#0F4C3A", fontFamily: "var(--font-marcellus), serif" }}
                >
                  {formaterPrix(selection.prix, selection.transaction)}
                </p>
                <p className="text-xs line-clamp-2 mb-1.5" style={{ color: "#3D4A42" }}>
                  {selection.titre}
                </p>
                <span className="text-xs font-medium" style={{ color: "#D4AF37" }}>
                  Voir la fiche →
                </span>
              </div>
            </div>
          </Link>
        </Popup>
      )}

      {/* Habillage du popup Mapbox + marqueurs pilule/cluster */}
      <style jsx global>{`
        .hoomy-popup-bien .mapboxgl-popup-content {
          background: transparent;
          padding: 0;
          box-shadow: none;
        }
        .hoomy-popup-bien .mapboxgl-popup-tip {
          display: none;
        }
        .pilule-prix {
          font-size: 12px;
          font-weight: 700;
          line-height: 1;
          padding: 6px 11px;
          border-radius: 999px;
          white-space: nowrap;
          cursor: pointer;
          border: 1.5px solid #D4AF37;
          box-shadow: 0 3px 12px rgba(15, 76, 58, 0.28);
          transition: transform 0.15s ease;
          user-select: none;
        }
        .pilule-prix:hover {
          transform: scale(1.06);
        }
        .bulle-cluster {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 38px;
          height: 38px;
          padding: 0 6px;
          border-radius: 999px;
          background: #0F4C3A;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          border: 2px solid #D4AF37;
          box-shadow: 0 4px 14px rgba(15, 76, 58, 0.32);
          user-select: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .pilule-prix { transition: none; }
          .pilule-prix:hover { transform: none; }
        }
      `}</style>
    </MapGL>
    </div>
  );
}
