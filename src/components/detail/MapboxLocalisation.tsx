"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState, useCallback } from "react";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// ── Styles Mapbox ─────────────────────────────────────────────────────────────
const STYLE_CLAIR     = "mapbox://styles/mapbox/streets-v12";
const STYLE_SOMBRE    = "mapbox://styles/mapbox/dark-v11";
const STYLE_SATELLITE = "mapbox://styles/mapbox/satellite-streets-v12";

// ── Langue des labels ─────────────────────────────────────────────────────────
export type LangueMapbox = "fr" | "ar" | "en" | "es";

function appliquerLangue(map: mapboxgl.Map, langue: LangueMapbox) {
  const expression: mapboxgl.Expression = [
    "coalesce",
    ["get", `name_${langue}`],
    ["get", "name"],
  ];
  map.getStyle()?.layers?.forEach((layer) => {
    if (layer.type !== "symbol") return;
    const champ = layer.layout?.["text-field"];
    if (!champ) return;
    // Ne traduire QUE les libellés basés sur "name" (villes, quartiers, rues,
    // POI). Les écussons de route affichent le numéro via "ref" ; les réécrire
    // avec name_xx (vide pour une route) laisse un rectangle blanc vide.
    if (!JSON.stringify(champ).includes("name")) return;
    map.setLayoutProperty(layer.id, "text-field", expression);
  });
}

// NOTE : le décalage de position est désormais calculé CÔTÉ SERVEUR
// (src/lib/geo/floutage.ts, dérivé d'un secret) — ce composant reçoit des
// coordonnées déjà approximatives et ne fait plus aucun floutage client.

// ── GeoJSON cercle de protection (~350 m) ─────────────────────────────────────
function cercleGeoJSON(lat: number, lng: number, rayonM: number) {
  const N = 64;
  const R = 6371000;
  const coords: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const angle = (i * 2 * Math.PI) / N;
    const dLat  = (rayonM / R) * (180 / Math.PI) * Math.cos(angle);
    const dLng  =
      (rayonM / (R * Math.cos((lat * Math.PI) / 180))) *
      (180 / Math.PI) *
      Math.sin(angle);
    coords.push([lng + dLng, lat + dLat]);
  }
  coords.push(coords[0]);
  return {
    type: "Feature" as const,
    geometry: { type: "Polygon" as const, coordinates: [coords] },
    properties: {},
  };
}

// ── Couleurs du cercle selon thème + mode ─────────────────────────────────────
function couleursTheme(sombre: boolean, satellite: boolean) {
  if (satellite) return { fill: "#D4AF37", fillOpacity: 0.20, border: "#D4AF37" };
  return sombre
    ? { fill: "#D4AF37", fillOpacity: 0.10, border: "#D4AF37" }
    : { fill: "#146C43", fillOpacity: 0.15, border: "#0F4C3A" };
}

// ── Props ─────────────────────────────────────────────────────────────────────
type Props = {
  latitude:  number;
  longitude: number;
  titre:     string;
  bienId:    string;
  langue?:   LangueMapbox;
};

// ── Icônes SVG inline ─────────────────────────────────────────────────────────
function IcSatellite() {
  return (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </svg>
  );
}

function IcPlan() {
  return (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

// ── Composant ─────────────────────────────────────────────────────────────────
export default function MapboxLocalisation({
  latitude,
  longitude,
  bienId,
  langue = "fr",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<mapboxgl.Map | null>(null);

  // État satellite partagé entre React (rendu du bouton) et les callbacks Mapbox (ref)
  const [satellite, setSatellite] = useState(false);
  const satelliteRef = useRef(false);

  // ── Bascule satellite / plan ───────────────────────────────────────────────
  const basculerSatellite = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const actif = !satelliteRef.current;
    satelliteRef.current = actif;
    setSatellite(actif);
    map.setStyle(
      actif
        ? STYLE_SATELLITE
        : document.documentElement.getAttribute("data-theme") === "dark"
        ? STYLE_SOMBRE
        : STYLE_CLAIR
    );
    // Les couches sont réajoutées automatiquement via l'événement "style.load"
  }, []);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) return;
    if (!containerRef.current || mapRef.current) return;

    // Coordonnées déjà floutées côté serveur — utilisées telles quelles
    const pos = { lat: latitude, lng: longitude };
    const estSombre = document.documentElement.getAttribute("data-theme") === "dark";

    const map = new mapboxgl.Map({
      container:        containerRef.current,
      style:            estSombre ? STYLE_SOMBRE : STYLE_CLAIR,
      center:           [pos.lng, pos.lat],
      zoom:             13,
      scrollZoom:       false,
      attributionControl: false,
    });

    mapRef.current = map;

    // ── Couches : idempotent, appelé à chaque changement de style ─────────────
    // NOTE : "style.load" se déclenche AU PREMIER CHARGEMENT et après tout
    // appel à setStyle() (toggle thème, toggle satellite). C'est le seul
    // endroit où les couches sont ajoutées — jamais dans "load" — pour éviter
    // le doublon.
    function ajouterCouches() {
      const sombre = document.documentElement.getAttribute("data-theme") === "dark";
      const col    = couleursTheme(sombre, satelliteRef.current);
      const data   = cercleGeoJSON(pos.lat, pos.lng, 350);

      if (!map.getSource("zone")) {
        map.addSource("zone", { type: "geojson", data });
      } else {
        (map.getSource("zone") as mapboxgl.GeoJSONSource).setData(data);
      }
      if (!map.getLayer("zone-fill")) {
        map.addLayer({
          id: "zone-fill", type: "fill", source: "zone",
          paint: { "fill-color": col.fill, "fill-opacity": col.fillOpacity },
        });
      }
      if (!map.getLayer("zone-border")) {
        map.addLayer({
          id: "zone-border", type: "line", source: "zone",
          paint: { "line-color": col.border, "line-width": 2.5 },
        });
      }

      // Masquer la frontière contestée du Sahara occidental
      if (map.getLayer("admin-0-boundary-disputed")) {
        map.setLayoutProperty("admin-0-boundary-disputed", "visibility", "none");
      }

      appliquerLangue(map, langue);
    }

    map.on("style.load", ajouterCouches);

    // ── Contrôles UI : ajoutés UNE SEULE FOIS dans "load" ─────────────────────
    // "load" ne se déclenche qu'au premier chargement (≠ "style.load" qui se
    // répète à chaque setStyle). C'est donc le seul endroit sûr pour addControl.
    map.on("load", () => {
      map.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        "bottom-right"
      );
      map.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions:    { enableHighAccuracy: true },
          showAccuracyCircle: false,
          trackUserLocation:  false,
          // Pas de crash si l'utilisateur refuse la géolocalisation —
          // GeolocateControl gère l'erreur en interne sans lever d'exception.
        }),
        "bottom-right"
      );
    });

    // ── Basculement thème jour/nuit (ignore si satellite actif) ───────────────
    const observer = new MutationObserver(() => {
      if (satelliteRef.current) return; // satellite est indépendant du thème
      const sombre = document.documentElement.getAttribute("data-theme") === "dark";
      map.setStyle(sombre ? STYLE_SOMBRE : STYLE_CLAIR);
    });

    observer.observe(document.documentElement, {
      attributes:      true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      observer.disconnect();
      satelliteRef.current = false;
      try {
        map.remove();
      } catch {
        // Mapbox peut lever si une requête async (telemetry, tuiles) se termine
        // après la destruction du composant — on ignore silencieusement.
      }
      mapRef.current = null;
    };
  }, [latitude, longitude, bienId, langue]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* ── Bouton satellite / plan ──────────────────────────────────────── */}
      <button
        type="button"
        onClick={basculerSatellite}
        title={satellite ? "Vue plan" : "Vue satellite"}
        style={{
          position:       "absolute",
          top:            10,
          left:           10,
          zIndex:         1,
          display:        "flex",
          alignItems:     "center",
          gap:            5,
          padding:        "5px 10px",
          borderRadius:   8,
          border:         "none",
          background:     "rgba(255,255,255,0.93)",
          color:          "#0F4C3A",
          fontSize:       12,
          fontWeight:     600,
          cursor:         "pointer",
          boxShadow:      "0 2px 8px rgba(0,0,0,0.18)",
          backdropFilter: "blur(4px)",
          fontFamily:     "var(--font-outfit), sans-serif",
          letterSpacing:  "0.01em",
          lineHeight:     1,
        }}
      >
        {satellite ? <IcPlan /> : <IcSatellite />}
        {satellite ? "Plan" : "Satellite"}
      </button>
    </div>
  );
}
