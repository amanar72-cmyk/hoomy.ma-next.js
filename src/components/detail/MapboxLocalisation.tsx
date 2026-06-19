"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

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

type Props = {
  latitude: number;
  longitude: number;
  titre: string;
};

export default function MapboxLocalisation({ latitude, longitude, titre }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [longitude, latitude],
      zoom: 15,
      scrollZoom: false,
      attributionControl: false,
    });

    mapRef.current = map;

    new mapboxgl.Marker({ color: "#0F4C3A" })
      .setLngLat([longitude, latitude])
      .setPopup(
        new mapboxgl.Popup({ closeButton: false }).setHTML(
          `<span style="font-family:var(--font-outfit,sans-serif);font-size:13px;color:#0F4C3A">${titre}</span>`
        )
      )
      .addTo(map);

    map.on("load", () => {
      const data = cercleGeoJSON(latitude, longitude, 350);

      map.addSource("zone", { type: "geojson", data });
      map.addLayer({
        id: "zone-fill",
        type: "fill",
        source: "zone",
        paint: { "fill-color": "#0F4C3A", "fill-opacity": 0.07 },
      });
      map.addLayer({
        id: "zone-border",
        type: "line",
        source: "zone",
        paint: {
          "line-color": "#0F4C3A",
          "line-width": 2,
          "line-dasharray": [4, 3],
          "line-opacity": 0.5,
        },
      });

      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude, titre]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
