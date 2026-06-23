"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// ── Langue des labels ─────────────────────────────────────────────────────────
// Centraliser ici : passer "ar" suffit pour basculer en arabe côté carte.
// Quand un contexte de langue global existera, il pourra alimenter la prop.
export type LangueMapbox = "fr" | "ar" | "en" | "es";

function appliquerLangue(map: mapboxgl.Map, langue: LangueMapbox) {
  // Parcourt toutes les couches symbol et remplace name → name_LANGUE avec
  // coalesce vers name en fallback (évite les tuiles sans traduction).
  const expression: mapboxgl.Expression = [
    "coalesce",
    ["get", `name_${langue}`],
    ["get", "name"],
  ];
  map.getStyle()?.layers?.forEach((layer) => {
    if (layer.type === "symbol" && layer.layout?.["text-field"]) {
      map.setLayoutProperty(layer.id, "text-field", expression);
    }
  });
}

// ── Position décalée (150–250 m, déterministe par UUID) ───────────────────────
function decalerPosition(lat: number, lng: number, bienId: string): { lat: number; lng: number } {
  const hex = bienId.replace(/-/g, "");
  const angleSeed = parseInt(hex.slice(0, 8), 16);
  const distanceSeed = parseInt(hex.slice(8, 16), 16);
  const angle = (angleSeed / 0xffffffff) * 2 * Math.PI;
  const distanceM = 150 + (distanceSeed / 0xffffffff) * 100;
  const R = 6371000;
  const dLat = (distanceM / R) * (180 / Math.PI) * Math.cos(angle);
  const dLng =
    (distanceM / (R * Math.cos((lat * Math.PI) / 180))) *
    (180 / Math.PI) *
    Math.sin(angle);
  return { lat: lat + dLat, lng: lng + dLng };
}

// ── GeoJSON cercle de ~350 m ───────────────────────────────────────────────────
function cercleGeoJSON(lat: number, lng: number, rayonM: number) {
  const N = 64;
  const R = 6371000;
  const coords: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const angle = (i * 2 * Math.PI) / N;
    const dLat = (rayonM / R) * (180 / Math.PI) * Math.cos(angle);
    const dLng =
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

// ── Couleurs du cercle selon le thème ─────────────────────────────────────────
function couleursTheme(sombre: boolean) {
  return sombre
    ? { fill: "#D4AF37", fillOpacity: 0.10, border: "#D4AF37" }
    : { fill: "#146C43", fillOpacity: 0.15, border: "#0F4C3A" };
}

// ── Props ─────────────────────────────────────────────────────────────────────
type Props = {
  latitude: number;
  longitude: number;
  titre: string;
  bienId: string;
  langue?: LangueMapbox; // "fr" par défaut, passer "ar" quand le switch FR/AR existera
};

export default function MapboxLocalisation({
  latitude,
  longitude,
  bienId,
  langue = "fr",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) return;
    if (!containerRef.current || mapRef.current) return;

    const pos = decalerPosition(latitude, longitude, bienId);
    const estSombre = document.documentElement.getAttribute("data-theme") === "dark";

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: estSombre
        ? "mapbox://styles/mapbox/dark-v11"
        : "mapbox://styles/mapbox/streets-v12",
      center: [pos.lng, pos.lat],
      zoom: 13,
      scrollZoom: false,
      attributionControl: false,
    });

    mapRef.current = map;

    // ── Ajoute cercle, masque frontière contestée, applique langue ────────────
    function ajouterCouches(sombre: boolean) {
      const col = couleursTheme(sombre);
      const data = cercleGeoJSON(pos.lat, pos.lng, 350);

      if (!map.getSource("zone")) {
        map.addSource("zone", { type: "geojson", data });
      }
      if (!map.getLayer("zone-fill")) {
        map.addLayer({
          id: "zone-fill",
          type: "fill",
          source: "zone",
          paint: { "fill-color": col.fill, "fill-opacity": col.fillOpacity },
        });
      }
      if (!map.getLayer("zone-border")) {
        map.addLayer({
          id: "zone-border",
          type: "line",
          source: "zone",
          // Trait continu — pas de line-dasharray
          paint: { "line-color": col.border, "line-width": 2.5 },
        });
      }

      // Masquer la frontière contestée du Sahara occidental
      if (map.getLayer("admin-0-boundary-disputed")) {
        map.setLayoutProperty("admin-0-boundary-disputed", "visibility", "none");
      }

      // Labels en français (ou la langue choisie)
      appliquerLangue(map, langue);

      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    }

    map.on("load", () => {
      ajouterCouches(document.documentElement.getAttribute("data-theme") === "dark");
    });

    // Après chaque changement de style (setStyle vide toutes les couches)
    map.on("style.load", () => {
      ajouterCouches(document.documentElement.getAttribute("data-theme") === "dark");
    });

    // Observer les changements de thème pour basculer le style de la carte
    const observer = new MutationObserver(() => {
      const sombre = document.documentElement.getAttribute("data-theme") === "dark";
      map.setStyle(
        sombre
          ? "mapbox://styles/mapbox/dark-v11"
          : "mapbox://styles/mapbox/streets-v12"
      );
      // ajouterCouches sera appelé par l'événement style.load qui suit setStyle
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      observer.disconnect();
      try {
        map.remove();
      } catch {
        // Mapbox peut lever une exception lors du démontage si une requête async
        // (map-sessions, telemetry) se termine après la destruction de la carte
      }
      mapRef.current = null;
    };
  }, [latitude, longitude, bienId, langue]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
