"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/mapbox";
import { useCallback, useRef, useState } from "react";
import type { MapRef, MapEvent } from "react-map-gl/mapbox";
import { useTheme } from "@/lib/theme/useTheme";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Quartier = {
  nom: string;
  nom_ar: string;
  ville: string;
  latitude: number;
  longitude: number;
  prix_m2_appartement: number;
  prix_m2_villa: number;
  evolution_pct: number;
  score_ecoles: number;
  score_hopitaux: number;
  score_transports: number;
  score_commerces: number;
  score_securite: number;
  score_espaces_verts: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VILLES = [
  { id: "Maroc", label: "Tout le Maroc", lng: -6, lat: 29.5, zoom: 4.8 },
  { id: "Casablanca", label: "Casablanca", lng: -7.5898, lat: 33.5731, zoom: 11 },
  { id: "Marrakech", label: "Marrakech", lng: -7.9811, lat: 31.6295, zoom: 11 },
  { id: "Rabat", label: "Rabat", lng: -6.8416, lat: 34.0209, zoom: 11 },
];

function scoreGlobal(q: Quartier): number {
  return Math.round(
    (q.score_ecoles + q.score_hopitaux + q.score_transports +
      q.score_commerces + q.score_securite + q.score_espaces_verts) / 6
  );
}

function couleurScore(s: number): string {
  if (s >= 80) return "var(--primaire-clair)";
  if (s >= 60) return "var(--accent)";
  return "var(--erreur)";
}

function formatPrix(n: number): string {
  return n.toLocaleString("fr-MA") + " DH";
}

// ─── Popup content ────────────────────────────────────────────────────────────

const SCORES_DEF = [
  { clé: "score_ecoles" as const, label: "Écoles", icon: "🏫" },
  { clé: "score_hopitaux" as const, label: "Hôpitaux", icon: "🏥" },
  { clé: "score_transports" as const, label: "Transports", icon: "🚌" },
  { clé: "score_commerces" as const, label: "Commerces", icon: "🛒" },
  { clé: "score_securite" as const, label: "Sécurité", icon: "🔒" },
  { clé: "score_espaces_verts" as const, label: "Espaces verts", icon: "🌳" },
];

function ContenuPopup({ quartier, onFermer }: { quartier: Quartier; onFermer: () => void }) {
  const sg = scoreGlobal(quartier);
  const coul = couleurScore(sg);

  return (
    <div style={{ width: 280, fontFamily: "var(--font-outfit, sans-serif)", fontSize: 13 }}>
      {/* Header */}
      <div style={{ background: "var(--primaire)", padding: "12px 16px", position: "relative" }}>
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer"
          style={{
            position: "absolute", top: 10, right: 12, background: "transparent",
            border: "none", color: "var(--texte-sur-accent)", cursor: "pointer",
            fontSize: 16, lineHeight: 1, opacity: 0.65,
          }}
        >
          ×
        </button>
        <p style={{ color: "var(--texte-sur-accent)", fontWeight: 600, margin: 0, paddingRight: 20 }}>{quartier.nom}</p>
        <p dir="rtl" style={{ color: "var(--texte-sur-accent)", margin: "2px 0 0", fontSize: 12, opacity: 0.65 }}>
          {quartier.nom_ar}
        </p>
      </div>

      {/* Corps du popup — fond adaptatif */}
      <div style={{ background: "var(--fond-secondaire)" }}>
        {/* Prix */}
        <div style={{ display: "flex", gap: 12, padding: "10px 16px", borderBottom: "1px solid var(--bordure-legere)" }}>
          <div>
            <p style={{ color: "var(--texte-tertiaire)", fontSize: 11, margin: 0 }}>Appartement</p>
            <p style={{ fontWeight: 700, color: "var(--primaire)", margin: "2px 0 0" }}>
              {formatPrix(quartier.prix_m2_appartement)}/m²
            </p>
          </div>
          <div>
            <p style={{ color: "var(--texte-tertiaire)", fontSize: 11, margin: 0 }}>Villa</p>
            <p style={{ fontWeight: 700, color: "var(--primaire)", margin: "2px 0 0" }}>
              {formatPrix(quartier.prix_m2_villa)}/m²
            </p>
          </div>
          <div>
            <p style={{ color: "var(--texte-tertiaire)", fontSize: 11, margin: 0 }}>Évolution</p>
            <p style={{ fontWeight: 700, margin: "2px 0 0", color: quartier.evolution_pct >= 0 ? "var(--primaire-clair)" : "var(--erreur)" }}>
              {quartier.evolution_pct >= 0 ? "↑" : "↓"} {Math.abs(quartier.evolution_pct)}%
            </p>
          </div>
        </div>

        {/* Score global */}
        <div style={{ padding: "10px 16px", textAlign: "center", borderBottom: "1px solid var(--bordure-legere)" }}>
          <p style={{ color: "var(--texte-tertiaire)", fontSize: 11, margin: "0 0 4px" }}>Score qualité de vie</p>
          <p style={{
            fontSize: 28, fontWeight: 700, color: coul, margin: 0,
            fontFamily: "var(--font-marcellus, serif)",
          }}>
            {sg}<span style={{ fontSize: 12, fontWeight: 400, color: "var(--texte-pale)" }}>/100</span>
          </p>
        </div>

        {/* Scores détaillés */}
        <div style={{ padding: "10px 16px 12px" }}>
          {SCORES_DEF.map((s) => {
            const v = quartier[s.clé];
            return (
              <div key={s.clé} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 14, width: 20, flexShrink: 0 }}>{s.icon}</span>
                <span style={{ color: "var(--texte-secondaire)", width: 88, flexShrink: 0, fontSize: 11 }}>{s.label}</span>
                <div style={{ flex: 1, height: 4, background: "var(--bordure-legere)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${v}%`,
                    background: couleurScore(v), borderRadius: 4,
                  }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--texte-principal)", width: 22, textAlign: "right" }}>
                  {v}
                </span>
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: 10, color: "var(--texte-pale)", textAlign: "center", padding: "0 16px 10px", margin: 0 }}>
          Scores indicatifs HOOMY — données IPAI 2024
        </p>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

type Props = {
  quartiers: Quartier[];
};

export default function CarteMapboxIntelligente({ quartiers }: Props) {
  const mapRef = useRef<MapRef>(null);
  const [villeActive, setVilleActive] = useState("Maroc");
  const [selection, setSelection] = useState<Quartier | null>(null);
  const theme = useTheme();

  const mapStyle = theme === "dark"
    ? "mapbox://styles/mapbox/dark-v11"
    : "mapbox://styles/mapbox/streets-v12";

  function volerVers(ville: (typeof VILLES)[number]) {
    setVilleActive(ville.id);
    setSelection(null);
    mapRef.current?.getMap().flyTo({ center: [ville.lng, ville.lat], zoom: ville.zoom, duration: 1200 });
  }

  // Cache la frontière contestée du Sahara à chaque chargement de style
  const onCarteChargee = useCallback((e: MapEvent) => {
    const map = e.target;
    const cacher = () => {
      if (map.getLayer("admin-0-boundary-disputed")) {
        map.setLayoutProperty("admin-0-boundary-disputed", "visibility", "none");
      }
    };
    cacher();
    // Re-cacher après chaque changement de style (ex: bascule jour/nuit)
    map.on("style.load", cacher);
  }, []);

  const quartiersFiltres =
    villeActive === "Maroc"
      ? quartiers
      : quartiers.filter((q) => q.ville === villeActive);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* CSS du popup Mapbox — utilise les tokens pour le mode sombre */}
      <style>{`
        .hoomy-popup .mapboxgl-popup-content {
          padding: 0 !important;
          border-radius: 12px !important;
          overflow: hidden !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.22) !important;
          border: 1px solid var(--bordure) !important;
        }
        .hoomy-popup .mapboxgl-popup-tip { display: none !important; }
      `}</style>

      {/* Filtre de ville */}
      <div style={{
        position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
        zIndex: 10, display: "flex", gap: 6,
        background: "var(--fond-secondaire)",
        borderRadius: 40, padding: "5px 8px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
        border: "1px solid var(--bordure)",
      }}>
        {VILLES.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => volerVers(v)}
            style={{
              padding: "5px 14px", borderRadius: 32, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 500, transition: "all 0.2s",
              fontFamily: "var(--font-outfit, sans-serif)",
              background: villeActive === v.id ? "var(--primaire)" : "transparent",
              color: villeActive === v.id ? "var(--texte-sur-accent)" : "var(--texte-corps)",
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Légende */}
      <div style={{
        position: "absolute", bottom: 32, right: 16, zIndex: 10,
        background: "var(--fond-secondaire)",
        borderRadius: 10, padding: "10px 14px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
        border: "1px solid var(--bordure)",
        fontFamily: "var(--font-outfit, sans-serif)", fontSize: 12,
      }}>
        <p style={{ fontWeight: 600, color: "var(--primaire)", margin: "0 0 8px" }}>Score qualité de vie</p>
        {[
          { color: "var(--primaire-clair)", label: "≥ 80 — Excellent" },
          { color: "var(--accent)", label: "60–79 — Bien" },
          { color: "var(--erreur)", label: "< 60 — Moyen" },
        ].map((l) => (
          <div key={l.color} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: l.color, flexShrink: 0 }} />
            <span style={{ color: "var(--texte-secondaire)" }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Carte Mapbox — style adaptatif selon le thème */}
      <Map
        ref={mapRef}
        mapboxAccessToken={TOKEN}
        mapStyle={mapStyle}
        initialViewState={{ longitude: -6, latitude: 29.5, zoom: 4.8 }}
        style={{ width: "100%", height: "100%" }}
        onLoad={onCarteChargee}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {/* Marqueurs */}
        {quartiersFiltres.map((q, i) => {
          const sg = scoreGlobal(q);
          const coul = couleurScore(sg);
          return (
            <Marker
              key={`${q.ville}-${q.nom}-${i}`}
              longitude={q.longitude}
              latitude={q.latitude}
              anchor="center"
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSelection(q); }}
                aria-label={`${q.nom} — score ${sg}/100`}
                style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: coul,
                  border: "2.5px solid var(--fond-secondaire)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.22)",
                  color: "var(--texte-sur-accent)", fontWeight: 700, fontSize: 11,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-outfit, sans-serif)",
                  transition: "transform 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.15)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
              >
                {sg}
              </button>
            </Marker>
          );
        })}

        {/* Popup */}
        {selection && (
          <Popup
            longitude={selection.longitude}
            latitude={selection.latitude}
            anchor="bottom"
            offset={24}
            closeButton={false}
            maxWidth="300px"
            className="hoomy-popup"
            onClose={() => setSelection(null)}
          >
            <ContenuPopup quartier={selection} onFermer={() => setSelection(null)} />
          </Popup>
        )}
      </Map>
    </div>
  );
}
