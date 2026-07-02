"use client";

// Carte Mapbox des listes /acheter et /louer.
// Chargée UNIQUEMENT via dynamic import à l'ouverture du panneau (0 Ko sinon).
// Ne reçoit que des coordonnées APPROXIMATIVES (floutées côté serveur) :
// cercles de zone, jamais de pin exact.

import "mapbox-gl/dist/mapbox-gl.css";
import { useRef, useState, useMemo, useCallback } from "react";
import Map, { Source, Layer, Popup, NavigationControl } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import type { GeoJSONSource, MapMouseEvent } from "mapbox-gl";
import Link from "next/link";
import { formaterPrix } from "@/lib/format";
import type { PointCarte } from "@/lib/types";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// Rayon du cercle de zone : ~350 m convertis en pixels selon le zoom
// (métrique exacte via interpolation exponentielle base 2, latitude Maroc ~31°).
// Le ["max", 7, …] garantit un point visible même dézoomé.
const RAYON_ZONE_M = 350;
const METRES_PAR_PX_Z0 = 156543.03392 * Math.cos((31 * Math.PI) / 180);
const RAYON_ZONE_EXPR = [
  "max", 7,
  ["interpolate", ["exponential", 2], ["zoom"],
    0, RAYON_ZONE_M / METRES_PAR_PX_Z0,
    22, (RAYON_ZONE_M * 2 ** 22) / METRES_PAR_PX_Z0,
  ],
];

type Props = { points: PointCarte[] };

export default function CarteBiens({ points }: Props) {
  const mapRef = useRef<MapRef>(null);
  const [selection, setSelection] = useState<PointCarte | null>(null);

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
    <Map
      ref={mapRef}
      mapboxAccessToken={TOKEN}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      initialViewState={{ bounds, fitBoundsOptions: { padding: 70, maxZoom: 14 } }}
      style={{ width: "100%", height: "100%" }}
      interactiveLayerIds={["clusters", "zones"]}
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
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            "circle-radius": RAYON_ZONE_EXPR as any,
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
  );
}
