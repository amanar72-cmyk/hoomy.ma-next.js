"use client";

// Carte Mapbox des listes /acheter et /louer.
// Chargée UNIQUEMENT via dynamic import à l'ouverture du panneau (0 Ko sinon).
// Ne reçoit que des coordonnées APPROXIMATIVES (floutées côté serveur) :
// cercles de zone, jamais de pin exact.

import "mapbox-gl/dist/mapbox-gl.css";
import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import Map, { Source, Layer, Popup, NavigationControl } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import type { GeoJSONSource, MapMouseEvent, ExpressionSpecification } from "mapbox-gl";
import Link from "next/link";
import { formaterPrix } from "@/lib/format";
import type { PointCarte } from "@/lib/types";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// Rayon du cercle de zone : ~350 m rendus en pixels selon le zoom.
//
// Mapbox impose que ["zoom"] soit l'entrée DIRECTE d'un interpolate/step de
// NIVEAU SUPÉRIEUR — impossible de l'envelopper dans un max(). On obtient donc
// le plancher de visibilité (7 px quand on est dézoomé) via le clamping natif
// d'interpolate : en dessous du premier palier, la sortie reste constante.
// Au-dessus, l'interpolation exponentielle base 2 reproduit exactement la
// relation métrique 350 m ∝ 2^zoom (latitude Maroc ~31°).
const RAYON_ZONE_M = 350;
const RAYON_MIN_PX = 7;
const METRES_PAR_PX_Z0 = 156543.03392 * Math.cos((31 * Math.PI) / 180);
// Zoom auquel 350 m valent exactement 7 px → plancher en dessous de ce zoom.
const ZOOM_PLANCHER = Math.log2((RAYON_MIN_PX * METRES_PAR_PX_Z0) / RAYON_ZONE_M);
const RAYON_ZONE_EXPR: ExpressionSpecification = [
  "interpolate",
  ["exponential", 2],
  ["zoom"],
  ZOOM_PLANCHER, RAYON_MIN_PX,
  22, (RAYON_ZONE_M * 2 ** 22) / METRES_PAR_PX_Z0,
];

type Props = { points: PointCarte[] };

export default function CarteBiens({ points }: Props) {
  const mapRef = useRef<MapRef>(null);
  const conteneurRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<PointCarte | null>(null);
  // Fondu depuis l'aperçu statique une fois la carte interactive prête
  const [prete, setPrete] = useState(false);

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

  // GeoJSON cluster-ready — les propriétés portent la mini-carte
  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: points.map((p) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [p.lngApprox, p.latApprox] },
        properties: { ...p },
      })),
    }),
    [points]
  );

  // Cadrage initial sur l'ensemble des biens
  const bounds = useMemo(() => {
    const lats = points.map((p) => p.latApprox);
    const lngs = points.map((p) => p.lngApprox);
    return [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ] as [[number, number], [number, number]];
  }, [points]);

  const onClick = useCallback((e: MapMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature) { setSelection(null); return; }

    // Cluster → zoom d'expansion
    if (feature.properties?.cluster) {
      const clusterId = feature.properties.cluster_id as number;
      const source = mapRef.current?.getSource("biens") as GeoJSONSource | undefined;
      source?.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err || zoom == null) return;
        const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;
        mapRef.current?.easeTo({ center: [lng, lat], zoom: zoom + 0.5, duration: 500 });
      });
      return;
    }

    // Cercle de zone → mini-carte du bien
    setSelection(feature.properties as unknown as PointCarte);
  }, []);

  const cheminBien = (p: PointCarte) =>
    `/${p.transaction === "location" ? "louer" : "acheter"}/${p.slug ?? p.id}`;

  return (
    <div
      ref={conteneurRef}
      className="w-full h-full"
      style={{ opacity: prete ? 1 : 0, transition: "opacity 0.5s ease" }}
    >
    <Map
      ref={mapRef}
      mapboxAccessToken={TOKEN}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      initialViewState={{ bounds, fitBoundsOptions: { padding: 70, maxZoom: 14 } }}
      style={{ width: "100%", height: "100%" }}
      interactiveLayerIds={["clusters", "zones"]}
      onLoad={() => { setPrete(true); mapRef.current?.resize(); }}
      onClick={onClick}
      onMouseEnter={() => { const c = mapRef.current?.getCanvas(); if (c) c.style.cursor = "pointer"; }}
      onMouseLeave={() => { const c = mapRef.current?.getCanvas(); if (c) c.style.cursor = ""; }}
      attributionControl={false}
    >
      <NavigationControl position="top-right" showCompass={false} />

      <Source
        id="biens"
        type="geojson"
        data={geojson}
        cluster
        clusterMaxZoom={14}
        clusterRadius={60}
      >
        {/* Cercles de zone approximative — Vert Royal semi-transparent */}
        <Layer
          id="zones"
          type="circle"
          filter={["!", ["has", "point_count"]]}
          paint={{
            "circle-radius": RAYON_ZONE_EXPR,
            "circle-color": "#0F4C3A",
            "circle-opacity": 0.18,
            "circle-stroke-color": "#0F4C3A",
            "circle-stroke-width": 1.5,
            "circle-stroke-opacity": 0.45,
          }}
        />

        {/* Clusters — natifs Mapbox */}
        <Layer
          id="clusters"
          type="circle"
          filter={["has", "point_count"]}
          paint={{
            "circle-color": "#0F4C3A",
            "circle-radius": ["step", ["get", "point_count"], 18, 10, 24, 30, 30],
            "circle-opacity": 0.9,
            "circle-stroke-color": "#D4AF37",
            "circle-stroke-width": 2,
          }}
        />
        <Layer
          id="cluster-count"
          type="symbol"
          filter={["has", "point_count"]}
          layout={{
            "text-field": ["get", "point_count_abbreviated"],
            "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
            "text-size": 13,
          }}
          paint={{ "text-color": "#ffffff" }}
        />
      </Source>

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

      {/* Habillage du popup Mapbox (fond transparent, sans flèche) */}
      <style jsx global>{`
        .hoomy-popup-bien .mapboxgl-popup-content {
          background: transparent;
          padding: 0;
          box-shadow: none;
        }
        .hoomy-popup-bien .mapboxgl-popup-tip {
          display: none;
        }
      `}</style>
    </Map>
    </div>
  );
}
