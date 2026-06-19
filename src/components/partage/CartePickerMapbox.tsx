"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState } from "react";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const VILLES_COORDS: Record<string, [number, number]> = {
  Casablanca: [-7.5898, 33.5731],
  Marrakech: [-7.9811, 31.6295],
  Rabat: [-6.8416, 34.0209],
  Tanger: [-5.834, 35.7595],
  Agadir: [-9.5981, 30.4202],
  Fès: [-5.0078, 34.0181],
};

type Props = {
  initialLat: number | null;
  initialLng: number | null;
  ville: string;
  onChange: (lat: number | null, lng: number | null) => void;
};

export default function CartePickerMapbox({ initialLat, initialLng, ville, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [markerPlace, setMarkerPlace] = useState(!!(initialLat && initialLng));

  function placerMarqueur(map: mapboxgl.Map, lng: number, lat: number) {
    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
    } else {
      const marker = new mapboxgl.Marker({ color: "#0F4C3A", draggable: true })
        .setLngLat([lng, lat])
        .addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLngLat();
        onChangeRef.current(pos.lat, pos.lng);
      });

      markerRef.current = marker;
    }
    setMarkerPlace(true);
    onChangeRef.current(lat, lng);
  }

  function effacerMarqueur() {
    markerRef.current?.remove();
    markerRef.current = null;
    setMarkerPlace(false);
    onChangeRef.current(null, null);
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const coordsVille = VILLES_COORDS[ville];
    const center: [number, number] =
      initialLng && initialLat ? [initialLng, initialLat] : coordsVille ?? [-6, 32];
    const zoom = initialLat && initialLng ? 15 : coordsVille ? 13 : 6;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom,
      attributionControl: false,
    });

    mapRef.current = map;

    if (initialLat && initialLng) {
      map.on("load", () => {
        placerMarqueur(map, initialLng!, initialLat!);
      });
    }

    map.on("click", (e) => {
      placerMarqueur(map, e.lngLat.lng, e.lngLat.lat);
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Voler vers la ville sélectionnée si aucun marqueur n'est encore placé
  useEffect(() => {
    if (!mapRef.current || !ville || markerRef.current) return;
    const coords = VILLES_COORDS[ville];
    if (coords) {
      mapRef.current.flyTo({ center: coords, zoom: 13, duration: 900 });
    }
  }, [ville]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Instruction quand aucun marqueur */}
      {!markerPlace && (
        <div
          style={{
            position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)",
            background: "rgba(15,76,58,0.88)", color: "#fff",
            fontSize: 12, padding: "6px 14px", borderRadius: 20,
            pointerEvents: "none", display: "flex", alignItems: "center", gap: 6,
            whiteSpace: "nowrap",
          }}
        >
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Cliquez sur la carte pour placer l'épingle
        </div>
      )}

      {/* Bouton effacer quand marqueur placé */}
      {markerPlace && (
        <button
          type="button"
          onClick={effacerMarqueur}
          style={{
            position: "absolute", top: 10, right: 10,
            background: "white", border: "1px solid #E0DAC8",
            borderRadius: 8, padding: "5px 10px",
            fontSize: 12, cursor: "pointer", color: "#DC2626",
            boxShadow: "0 1px 6px rgba(0,0,0,0.12)",
            display: "flex", alignItems: "center", gap: 5,
            fontFamily: "var(--font-outfit, sans-serif)",
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Effacer la position
        </button>
      )}
    </div>
  );
}
