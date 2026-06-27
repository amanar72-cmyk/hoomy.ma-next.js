"use client";

import { useEffect, useRef } from "react";
import type { MoyenneVille } from "@/app/carte-des-prix/page";
import { couleurHeatmap } from "./heatmapUtils";

// CSS Leaflet côté client uniquement
import "leaflet/dist/leaflet.css";

type Props = {
  moyennesVilles: MoyenneVille[];
  villeActive: string | null;
  onSelectVille: (ville: string) => void;
};

const ZOOM_NATIONAL = 5;
const ZOOM_VILLE = 11;
const CENTRE_MAROC: [number, number] = [31.7, -7.0];

export default function CarteLeaflet({ moyennesVilles, villeActive, onSelectVille }: Props) {
  const conteneurRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  // Garde une référence sur chaque marqueur pour pouvoir les mettre à jour
  const marqueursRef = useRef<Record<string, import("leaflet").CircleMarker>>({});

  const prixMin = Math.min(...moyennesVilles.map((v) => v.prixMoyen));
  const prixMax = Math.max(...moyennesVilles.map((v) => v.prixMoyen));

  // ── Initialisation de la carte (une seule fois) ───────────────────────────
  useEffect(() => {
    if (!conteneurRef.current || mapRef.current) return;

    // Import dynamique de Leaflet pour éviter "window is not defined"
    import("leaflet").then((L) => {
      const map = L.map(conteneurRef.current!, {
        center: CENTRE_MAROC,
        zoom: ZOOM_NATIONAL,
        zoomControl: true,
        attributionControl: true,
      });

      // Tuiles OpenStreetMap
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      // Style de la carte pour coller au fond sombre
      const canvas = conteneurRef.current!;
      canvas.style.filter = "brightness(0.85) saturate(0.8)";

      // Marqueurs des 5 villes
      moyennesVilles.forEach((v) => {
        const couleur = couleurHeatmap(v.prixMoyen, prixMin, prixMax);

        const marqueur = L.circleMarker([v.lat, v.lng], {
          radius: 22,
          color: couleur,
          fillColor: couleur,
          fillOpacity: 0.75,
          weight: 2,
        });

        // Popup avec nom + prix
        marqueur.bindTooltip(
          `<b style="font-family:sans-serif;font-size:13px">${v.ville}</b><br/>
           <span style="color:#D4AF37;font-weight:600">${v.prixMoyen.toLocaleString("fr-FR")} DH/m²</span>`,
          { permanent: false, direction: "top", offset: [0, -14] }
        );

        // Halo doré au survol
        marqueur.on("mouseover", () => {
          marqueur.setStyle({ weight: 4, color: "#D4AF37", radius: 26 });
        });
        marqueur.on("mouseout", () => {
          marqueur.setStyle({ weight: 2, color: couleur, radius: 22 });
        });

        marqueur.on("click", () => onSelectVille(v.ville));
        marqueur.addTo(map);
        marqueursRef.current[v.ville] = marqueur;
      });

      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        marqueursRef.current = {};
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Réaction au changement de ville active ────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (villeActive) {
      const ville = moyennesVilles.find((v) => v.ville === villeActive);
      if (ville) {
        map.flyTo([ville.lat, ville.lng], ZOOM_VILLE, { duration: 1 });
      }
      // Halo doré permanent sur la ville active
      Object.entries(marqueursRef.current).forEach(([nom, m]) => {
        const v = moyennesVilles.find((mv) => mv.ville === nom)!;
        const couleur = couleurHeatmap(v.prixMoyen, prixMin, prixMax);
        if (nom === villeActive) {
          m.setStyle({ weight: 4, color: "#D4AF37", radius: 28 });
        } else {
          m.setStyle({ weight: 2, color: couleur, radius: 22 });
        }
      });
    } else {
      map.flyTo(CENTRE_MAROC, ZOOM_NATIONAL, { duration: 1 });
      Object.entries(marqueursRef.current).forEach(([nom, m]) => {
        const v = moyennesVilles.find((mv) => mv.ville === nom)!;
        const couleur = couleurHeatmap(v.prixMoyen, prixMin, prixMax);
        m.setStyle({ weight: 2, color: couleur, radius: 22 });
      });
    }
  }, [villeActive, moyennesVilles, prixMin, prixMax]);

  return (
    <div
      ref={conteneurRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 400,
        borderRadius: "0 0 0 0",
        overflow: "hidden",
      }}
    />
  );
}
