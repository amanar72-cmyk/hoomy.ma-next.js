"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/mapbox";
import { useRef, useState } from "react";
import type { MapRef } from "react-map-gl/mapbox";

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
  { id: "Maroc", label: "Tout le Maroc", lng: -6, lat: 32, zoom: 5.5 },
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
  if (s >= 80) return "#146C43";
  if (s >= 60) return "#D4AF37";
  return "#DC2626";
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
      <div style={{ background: "#0F4C3A", padding: "12px 16px", position: "relative" }}>
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer"
          style={{
            position: "absolute", top: 10, right: 12, background: "transparent",
            border: "none", color: "rgba(255,255,255,0.65)", cursor: "pointer", fontSize: 16, lineHeight: 1,
          }}
        >
          ×
        </button>
        <p style={{ color: "#fff", fontWeight: 600, margin: 0, paddingRight: 20 }}>{quartier.nom}</p>
        <p dir="rtl" style={{ color: "rgba(255,255,255,0.65)", margin: "2px 0 0", fontSize: 12 }}>
          {quartier.nom_ar}
        </p>
      </div>

      {/* Prix */}
      <div style={{ display: "flex", gap: 12, padding: "10px 16px", borderBottom: "1px solid #F0EDE5" }}>
        <div>
          <p style={{ color: "#9DB8AD", fontSize: 11, margin: 0 }}>Appartement</p>
          <p style={{ fontWeight: 700, color: "#0F4C3A", margin: "2px 0 0" }}>
            {formatPrix(quartier.prix_m2_appartement)}/m²
          </p>
        </div>
        <div>
          <p style={{ color: "#9DB8AD", fontSize: 11, margin: 0 }}>Villa</p>
          <p style={{ fontWeight: 700, color: "#0F4C3A", margin: "2px 0 0" }}>
            {formatPrix(quartier.prix_m2_villa)}/m²
          </p>
        </div>
        <div>
          <p style={{ color: "#9DB8AD", fontSize: 11, margin: 0 }}>Évolution</p>
          <p style={{ fontWeight: 700, margin: "2px 0 0", color: quartier.evolution_pct >= 0 ? "#146C43" : "#DC2626" }}>
            {quartier.evolution_pct >= 0 ? "↑" : "↓"} {Math.abs(quartier.evolution_pct)}%
          </p>
        </div>
      </div>

      {/* Score global */}
      <div style={{ padding: "10px 16px", textAlign: "center", borderBottom: "1px solid #F0EDE5" }}>
        <p style={{ color: "#9DB8AD", fontSize: 11, margin: "0 0 4px" }}>Score qualité de vie</p>
        <p style={{
          fontSize: 28, fontWeight: 700, color: coul, margin: 0,
          fontFamily: "var(--font-marcellus, serif)",
        }}>
          {sg}<span style={{ fontSize: 12, fontWeight: 400, color: "#C4BFAE" }}>/100</span>
        </p>
      </div>

      {/* Scores détaillés */}
      <div style={{ padding: "10px 16px 12px" }}>
        {SCORES_DEF.map((s) => {
          const v = quartier[s.clé];
          return (
            <div key={s.clé} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 14, width: 20, flexShrink: 0 }}>{s.icon}</span>
              <span style={{ color: "#6B7A71", width: 88, flexShrink: 0, fontSize: 11 }}>{s.label}</span>
              <div style={{ flex: 1, height: 4, background: "#F0EDE5", borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${v}%`,
                  background: couleurScore(v), borderRadius: 4,
                }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#1a2822", width: 22, textAlign: "right" }}>
                {v}
              </span>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 10, color: "#C4BFAE", textAlign: "center", padding: "0 16px 10px", margin: 0 }}>
        Scores indicatifs HOOMY — données IPAI 2024
      </p>
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

  function volerVers(ville: (typeof VILLES)[number]) {
    setVilleActive(ville.id);
    setSelection(null);
    mapRef.current?.getMap().flyTo({ center: [ville.lng, ville.lat], zoom: ville.zoom, duration: 1200 });
  }

  const quartiersFiltres =
    villeActive === "Maroc"
      ? quartiers
      : quartiers.filter((q) => q.ville === villeActive);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* CSS override pour le popup Mapbox */}
      <style>{`
        .hoomy-popup .mapboxgl-popup-content {
          padding: 0 !important;
          border-radius: 12px !important;
          overflow: hidden !important;
          box-shadow: 0 8px 32px rgba(15,76,58,0.18) !important;
          border: 1px solid #EDE7D7 !important;
        }
        .hoomy-popup .mapboxgl-popup-tip { display: none !important; }
      `}</style>

      {/* Filtre de ville */}
      <div style={{
        position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
        zIndex: 10, display: "flex", gap: 6, background: "white",
        borderRadius: 40, padding: "5px 8px",
        boxShadow: "0 2px 12px rgba(15,76,58,0.15)", border: "1px solid #EDE7D7",
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
              background: villeActive === v.id ? "#0F4C3A" : "transparent",
              color: villeActive === v.id ? "#fff" : "#3D4A42",
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Légende */}
      <div style={{
        position: "absolute", bottom: 32, right: 16, zIndex: 10,
        background: "white", borderRadius: 10, padding: "10px 14px",
        boxShadow: "0 2px 12px rgba(15,76,58,0.12)", border: "1px solid #EDE7D7",
        fontFamily: "var(--font-outfit, sans-serif)", fontSize: 12,
      }}>
        <p style={{ fontWeight: 600, color: "#0F4C3A", margin: "0 0 8px" }}>Score qualité de vie</p>
        {[
          { color: "#146C43", label: "≥ 80 — Excellent" },
          { color: "#D4AF37", label: "60–79 — Bien" },
          { color: "#DC2626", label: "< 60 — Moyen" },
        ].map((l) => (
          <div key={l.color} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: l.color, flexShrink: 0 }} />
            <span style={{ color: "#6B7A71" }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Carte Mapbox */}
      <Map
        ref={mapRef}
        mapboxAccessToken={TOKEN}
        mapStyle="mapbox://styles/mapbox/light-v11"
        initialViewState={{ longitude: -6, latitude: 32, zoom: 5.5 }}
        style={{ width: "100%", height: "100%" }}
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
                  background: coul, border: "2.5px solid white",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.22)",
                  color: "#fff", fontWeight: 700, fontSize: 11,
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
