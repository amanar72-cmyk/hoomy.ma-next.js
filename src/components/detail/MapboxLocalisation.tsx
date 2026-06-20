"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

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

// ── Couleurs selon le thème (ne peuvent pas être des CSS vars dans Mapbox API) ─
function couleursTheme(sombre: boolean) {
  return sombre
    ? { marker: "#D4AF37", fill: "#D4AF37", fillOpacity: 0.10, border: "#D4AF37" }
    : { marker: "#0F4C3A", fill: "#146C43", fillOpacity: 0.15, border: "#0F4C3A" };
}

// ── Props ─────────────────────────────────────────────────────────────────────
type Props = {
  latitude: number;
  longitude: number;
  titre: string;
  bienId: string;
};

export default function MapboxLocalisation({ latitude, longitude, titre, bienId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const pos = decalerPosition(latitude, longitude, bienId);
    const estSombre = document.documentElement.getAttribute("data-theme") === "dark";
    const c = couleursTheme(estSombre);

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: estSombre
        ? "mapbox://styles/mapbox/dark-v11"
        : "mapbox://styles/mapbox/streets-v12",
      center: [pos.lng, pos.lat],
      zoom: 15,
      scrollZoom: false,
      attributionControl: false,
    });

    mapRef.current = map;

    // Marqueur — couleur adaptatif (CSS var non supporté dans Mapbox Marker.color)
    markerRef.current = new mapboxgl.Marker({ color: c.marker })
      .setLngLat([pos.lng, pos.lat])
      .setPopup(
        // CSS variables valides dans les innerHTML (DOM normal)
        new mapboxgl.Popup({ closeButton: false }).setHTML(
          `<span style="font-family:var(--font-outfit,sans-serif);font-size:13px;color:var(--primaire)">${titre}</span>`
        )
      )
      .addTo(map);

    // Ajoute les couches cercle + masque la frontière du Sahara
    function ajouterCouches(sombre: boolean) {
      const col = couleursTheme(sombre);
      const data = cercleGeoJSON(pos.lat, pos.lng, 350);

      if (!map.getSource("zone")) {
        map.addSource("zone", { type: "geojson", data });
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
      if (map.getLayer("admin-0-boundary-disputed")) {
        map.setLayoutProperty("admin-0-boundary-disputed", "visibility", "none");
      }
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    }

    map.on("load", () => {
      ajouterCouches(document.documentElement.getAttribute("data-theme") === "dark");
    });

    // Re-ajouter les couches après chaque changement de style (setStyle vide tout)
    map.on("style.load", () => {
      ajouterCouches(document.documentElement.getAttribute("data-theme") === "dark");
    });

    // Observer les changements de thème pour basculer le style de la carte
    const observer = new MutationObserver(() => {
      const sombre = document.documentElement.getAttribute("data-theme") === "dark";
      const col = couleursTheme(sombre);

      // Mise à jour du style cartographique (déclenche style.load → ajouterCouches)
      map.setStyle(
        sombre
          ? "mapbox://styles/mapbox/dark-v11"
          : "mapbox://styles/mapbox/streets-v12"
      );

      // Mise à jour du marqueur (couleur non CSS-variable dans Mapbox API)
      markerRef.current?.remove();
      markerRef.current = new mapboxgl.Marker({ color: col.marker })
        .setLngLat([pos.lng, pos.lat])
        .setPopup(
          new mapboxgl.Popup({ closeButton: false }).setHTML(
            `<span style="font-family:var(--font-outfit,sans-serif);font-size:13px;color:var(--primaire)">${titre}</span>`
          )
        )
        .addTo(map);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      observer.disconnect();
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [latitude, longitude, titre, bienId]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
