"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { calculerEstimation } from "@/lib/estimer/calcul";
import type { ResultatEstimation } from "@/lib/estimer/calcul";
import { chargerQuartiersGeo, trouverQuartierProche } from "@/lib/estimer/quartierProche";
import type { QuartierGeo } from "@/lib/estimer/quartierProche";
import type { User } from "@supabase/supabase-js";

const ChampTelephone = dynamic(
  () => import("./ChampTelephone"),
  { ssr: false, loading: () => <div className="h-12 rounded-xl bg-[#F5F1E8] animate-pulse" /> }
);

// ─── Types ───────────────────────────────────────────────────────────────────

type Transaction = "vente" | "location";
type EtatBien = "neuf" | "bon_etat" | "a_renover";
type EtageBien = "rdc" | "intermediaire" | "dernier";

interface DonneesWizard {
  transaction: Transaction | "";
  typeBien: string;
  latitude: number | null;
  longitude: number | null;
  ville: string;
  quartier: string;
  adresseComplete: string;
  surface: string;
  chambres: number;
  sallesBain: number;
  etat: EtatBien | "";
  etage: EtageBien | "";
  equipements: string[];
  nom: string;
  email: string;
  telephone: string;
  motDePasse: string;
}

const DONNEES_VIDES: DonneesWizard = {
  transaction: "",
  typeBien: "",
  latitude: null,
  longitude: null,
  ville: "",
  quartier: "",
  adresseComplete: "",
  surface: "",
  chambres: 2,
  sallesBain: 1,
  etat: "",
  etage: "",
  equipements: [],
  nom: "",
  email: "",
  telephone: "",
  motDePasse: "",
};

// ─── Constantes ──────────────────────────────────────────────────────────────

const VILLES = ["Casablanca", "Marrakech", "Rabat", "Tanger", "Agadir", "Fès"];

const TYPES_BIEN = [
  {
    id: "Appartement",
    label: "Appartement",
    icon: (
      <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.4">
        <rect x="2" y="3" width="20" height="19" rx="2" />
        <path d="M2 9h20M9 9v13M15 9v13" strokeOpacity="0.55" />
        <path d="M5 6h2M11 6h2M17 6h2" strokeLinecap="round" />
        <path d="M5 13h2M5 17h2M11 13h2M11 17h2M17 13h2M17 17h2" strokeLinecap="round" strokeOpacity="0.7" />
      </svg>
    ),
  },
  {
    id: "Villa",
    label: "Villa",
    icon: (
      <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.4">
        <path d="M3 9.5l9-7 9 7V21H3V9.5z" />
        <path d="M9 21v-6h6v6" />
        <path d="M12 2.5L1 11M12 2.5L23 11" strokeOpacity="0.4" />
      </svg>
    ),
  },
  {
    id: "Riad",
    label: "Riad",
    icon: (
      <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.4">
        <path d="M3 21V10l9-8 9 8v11H3z" />
        <path d="M9 21v-4c0-1.66 1.34-3 3-3s3 1.34 3 3v4" />
        <path d="M8 10.5c0-2.21 1.79-4 4-4s4 1.79 4 4" strokeOpacity="0.5" />
        <circle cx="12" cy="8.5" r="1.5" strokeOpacity="0.5" />
      </svg>
    ),
  },
  {
    id: "Bureau",
    label: "Bureau",
    icon: (
      <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.4">
        <rect x="2" y="2" width="20" height="20" rx="2" />
        <path d="M2 8h20" strokeOpacity="0.6" />
        <path d="M8 2v6M16 2v6" strokeOpacity="0.4" />
        <path d="M5 12h3M5 16h3M11 12h3M11 16h3M17 12h2M17 16h2" strokeLinecap="round" strokeOpacity="0.75" />
      </svg>
    ),
  },
  {
    id: "Terrain",
    label: "Terrain",
    icon: (
      <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.4">
        <path d="M2 20h20" strokeLinecap="round" />
        <path d="M4 20l4-7 3 4 3-5 4 8" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6" />
        <path d="M17 8l2-4M19 8l2-4" strokeLinecap="round" strokeOpacity="0.4" />
        <circle cx="18" cy="6" r="1" fill="currentColor" fillOpacity="0.4" stroke="none" />
      </svg>
    ),
  },
];

const EQUIPEMENTS = [
  { id: "ascenseur", label: "Ascenseur", emoji: "🛗" },
  { id: "parking", label: "Parking", emoji: "🅿️" },
  { id: "piscine", label: "Piscine", emoji: "🏊" },
  { id: "terrasse", label: "Terrasse", emoji: "🌿" },
  { id: "jardin", label: "Jardin", emoji: "🌳" },
  { id: "vue", label: "Vue dégagée", emoji: "🌅" },
];

const ETAPES_LABELS = ["Transaction", "Type", "Localisation", "Surface", "État", "Compte"];

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function formatPrix(n: number): string {
  return n.toLocaleString("fr-FR") + " DH";
}

// ─── Composants utilitaires ───────────────────────────────────────────────────

function BarreProgression({ etape }: { etape: number }) {
  const pct = Math.round(((etape - 1) / 5) * 100);
  return (
    <div className="px-8 pt-5 pb-1">
      <div className="relative h-1.5 bg-[#EDE7D7] rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #0F4C3A 0%, #D4AF37 100%)",
          }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs" style={{ color: "var(--texte-tertiaire)" }}>
          Étape{" "}
          <span className="font-semibold" style={{ color: "var(--primaire)" }}>
            {etape}
          </span>{" "}
          sur 6
        </p>
        <p className="text-xs font-medium" style={{ color: "var(--texte-tertiaire)" }}>
          {ETAPES_LABELS[etape - 1]}
        </p>
      </div>
    </div>
  );
}

function CarteChoix({
  selectionne,
  onClick,
  children,
  large = false,
}: {
  selectionne: boolean;
  onClick: () => void;
  children: React.ReactNode;
  large?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 transition-all duration-200 cursor-pointer w-full ${
        large ? "p-7" : "p-5"
      }`}
      style={{
        borderColor: selectionne ? "var(--primaire)" : "var(--bordure)",
        background: selectionne ? "var(--fond-vert-leger)" : "var(--fond-secondaire)",
        boxShadow: selectionne
          ? "0 0 0 3px rgba(15,76,58,0.08)"
          : "0 2px 8px rgba(15,76,58,0.04)",
        color: selectionne ? "var(--primaire)" : "#4A5A50",
      }}
    >
      {children}
    </button>
  );
}

function Compteur({
  label,
  valeur,
  onChange,
  min = 0,
  max = 20,
}: {
  label: string;
  valeur: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center justify-between py-4" style={{ borderBottom: "1px solid #F0EDE5" }}>
      <span className="text-base font-medium" style={{ color: "var(--texte-principal)" }}>
        {label}
      </span>
      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, valeur - 1))}
          disabled={valeur <= min}
          className="w-9 h-9 rounded-full flex items-center justify-center text-xl font-light transition-colors disabled:opacity-25"
          style={{ border: "1.5px solid #EDE7D7", color: "var(--primaire)" }}
          aria-label={`Diminuer ${label}`}
        >
          −
        </button>
        <span
          className="w-6 text-center text-xl font-semibold tabular-nums"
          style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}
        >
          {valeur}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, valeur + 1))}
          disabled={valeur >= max}
          className="w-9 h-9 rounded-full flex items-center justify-center text-xl font-light transition-colors disabled:opacity-25"
          style={{ border: "1.5px solid #EDE7D7", color: "var(--primaire)" }}
          aria-label={`Augmenter ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function ChampTexte({
  label,
  type = "text",
  valeur,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  type?: string;
  valeur: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium" style={{ color: "var(--texte-corps)" }}>
        {label}
      </label>
      <input
        type={type}
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-xl px-4 text-base outline-none transition-all"
        style={{
          height: 48,
          border: "1.5px solid #EDE7D7",
          color: "var(--texte-principal)",
          background: "var(--fond-secondaire)",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "var(--primaire)";
          e.target.style.boxShadow = "0 0 0 3px rgba(15,76,58,0.08)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "var(--bordure)";
          e.target.style.boxShadow = "none";
        }}
      />
    </div>
  );
}

function AlerteErreur({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm"
      style={{ background: "#FFF3F3", border: "1px solid #FFD6D6", color: "#B91C1C" }}
    >
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {message}
    </div>
  );
}

// ─── Carte Mapbox interactive — étape 3 ──────────────────────────────────────

const TOKEN_MAPBOX = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const SVG_PIN =
  `<svg width="36" height="48" viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg">` +
  `<path d="M18 0C8.059 0 0 8.059 0 18C0 28.941 18 48 18 48C18 48 36 28.941 36 18C36 8.059 27.941 0 18 0Z" fill="#0F4C3A"/>` +
  `<circle cx="18" cy="18" r="9" fill="#D4AF37"/>` +
  `<circle cx="18" cy="18" r="4.5" fill="#0F4C3A"/>` +
  `</svg>`;

type PositionGeo = { lat: number; lng: number; ville: string; quartier: string; adresseComplete: string; quartierDetecte: boolean };
type SuggestionGeo = { id: string; text: string; place_name: string; center: [number, number] };

function matcherVille(texte: string): string {
  const t = texte.toLowerCase();
  const ALIAS: Record<string, string> = {
    casablanca: "Casablanca", "dar el beida": "Casablanca",
    marrakech: "Marrakech", marrakesh: "Marrakech",
    rabat: "Rabat", "temara": "Rabat",
    tanger: "Tanger", tangier: "Tanger", "tetouan": "Tanger",
    agadir: "Agadir",
    fès: "Fès", fes: "Fès", fez: "Fès",
  };
  for (const [alias, ville] of Object.entries(ALIAS)) {
    if (t.includes(alias)) return ville;
  }
  return "";
}

function parseFeatureGeo(f: Record<string, unknown>): { ville: string; quartier: string; adresseComplete: string } {
  const adresseComplete = (f.place_name as string) ?? "";
  let ville = "";
  let quartier = "";
  const placeTypes = (f.place_type as string[]) ?? [];
  if (placeTypes.includes("place")) {
    const v = matcherVille((f.text as string) ?? "");
    if (v) ville = v;
  }
  const ctx = (f.context as Array<{ id: string; text: string }>) ?? [];
  for (const c of ctx) {
    const id = c.id ?? "";
    if ((id.startsWith("place.") || id.startsWith("locality.")) && !ville) {
      const v = matcherVille(c.text ?? "");
      if (v) ville = v;
    }
    if ((id.startsWith("neighborhood.") || id.startsWith("district.")) && !quartier) {
      quartier = c.text ?? "";
    }
  }
  return { ville, quartier, adresseComplete };
}

function CarteLocalisationEtape({
  positionInitiale,
  onPosition,
}: {
  positionInitiale: PositionGeo | null;
  onPosition: (pos: PositionGeo) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const onPositionRef = useRef(onPosition);
  const quartiersRef = useRef<QuartierGeo[]>([]);
  const [rechercheTexte, setRechercheTexte] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionGeo[]>([]);
  const [suggestionVisible, setSuggestionVisible] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Garde la référence à jour sans re-créer la carte
  useEffect(() => { onPositionRef.current = onPosition; });

  // Chargement des quartiers Supabase au montage — une seule fois, erreur silencieuse
  useEffect(() => {
    chargerQuartiersGeo().then((q) => { quartiersRef.current = q; });
  }, []);

  // Initialisation de la carte (une seule fois)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = TOKEN_MAPBOX;

    const centreInit: [number, number] = positionInitiale
      ? [positionInitiale.lng, positionInitiale.lat]
      : [-6.0, 31.5];
    const zoomInit = positionInitiale ? 14 : 5.5;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: centreInit,
      zoom: zoomInit,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    mapRef.current = map;

    // Marqueur draggable — SVG premium
    const elPin = document.createElement("div");
    elPin.innerHTML = SVG_PIN;
    elPin.style.cssText = "cursor:grab;filter:drop-shadow(0 4px 10px rgba(0,0,0,0.28));";
    elPin.addEventListener("mousedown", () => { elPin.style.cursor = "grabbing"; });
    elPin.addEventListener("mouseup", () => { elPin.style.cursor = "grab"; });

    const marker = new mapboxgl.Marker({ element: elPin, draggable: true, anchor: "bottom" });
    if (positionInitiale) {
      marker.setLngLat([positionInitiale.lng, positionInitiale.lat]).addTo(map);
    }
    markerRef.current = marker;

    // Reverse geocoding (défini dans l'effet pour accéder aux refs stables)
    async function reverseGeocode(lat: number, lng: number) {
      try {
        const url =
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
          `?access_token=${TOKEN_MAPBOX}&language=fr&types=address,neighborhood,place&country=MA`;
        const json = await (await fetch(url)).json();
        const feature = json.features?.[0];
        const parsed = feature
          ? parseFeatureGeo(feature as Record<string, unknown>)
          : { ville: "", quartier: "", adresseComplete: "" };

        // Enrichir avec le quartier le plus proche de notre base de données
        const quartierBDD = trouverQuartierProche(lat, lng, quartiersRef.current);

        onPositionRef.current({
          lat,
          lng,
          ...parsed,
          // Le quartier Supabase est prioritaire (données alignées avec grille_prix)
          quartier: quartierBDD?.nom ?? parsed.quartier,
          quartierDetecte: !!quartierBDD,
        });
      } catch { /* erreur réseau silencieuse */ }
    }

    // Clic sur la carte → pose le marqueur
    map.on("click", (e) => {
      marker.setLngLat(e.lngLat).addTo(map);
      reverseGeocode(e.lngLat.lat, e.lngLat.lng);
    });

    // Fin de glissement → reverse geocode
    marker.on("dragend", () => {
      const pos = marker.getLngLat();
      reverseGeocode(pos.lat, pos.lng);
    });

    // Masquer la frontière du Sahara
    map.on("load", () => {
      if (map.getLayer("admin-0-boundary-disputed")) {
        map.setLayoutProperty("admin-0-boundary-disputed", "visibility", "none");
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Forward geocoding — recherche avec debounce
  async function rechercherSuggestions(texte: string) {
    if (!texte || texte.length < 3) { setSuggestions([]); setSuggestionVisible(false); return; }
    try {
      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(texte)}.json` +
        `?access_token=${TOKEN_MAPBOX}&language=fr&country=MA&autocomplete=true&limit=5` +
        `&types=address,neighborhood,place,locality`;
      const json = await (await fetch(url)).json();
      const res: SuggestionGeo[] = (json.features ?? []).map((f: Record<string, unknown>) => ({
        id: f.id as string,
        text: f.text as string,
        place_name: f.place_name as string,
        center: f.center as [number, number],
      }));
      setSuggestions(res);
      setSuggestionVisible(res.length > 0);
    } catch { setSuggestions([]); }
  }

  function handleRechercheChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setRechercheTexte(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => rechercherSuggestions(val), 380);
  }

  function choisirSuggestion(s: SuggestionGeo) {
    setSuggestionVisible(false);
    setRechercheTexte(s.place_name);
    const [lng, lat] = s.center;
    if (mapRef.current && markerRef.current) {
      mapRef.current.flyTo({ center: [lng, lat], zoom: 15, duration: 1000 });
      markerRef.current.setLngLat([lng, lat]).addTo(mapRef.current);
      const parsedGeo = parseFeatureGeo({ place_name: s.place_name, text: s.text, place_type: [], context: [] });
      const quartierBDD = trouverQuartierProche(lat, lng, quartiersRef.current);
      onPositionRef.current({
        lat,
        lng,
        ...parsedGeo,
        quartier: quartierBDD?.nom ?? parsedGeo.quartier,
        quartierDetecte: !!quartierBDD,
      });
    }
  }

  const inputBaseStyle: React.CSSProperties = {
    width: "100%",
    height: 44,
    borderRadius: 10,
    border: "1.5px solid var(--bordure)",
    padding: "0 12px 0 36px",
    fontSize: 13,
    background: "var(--fond-secondaire)",
    color: "var(--texte-principal)",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div>
      {/* Barre de recherche d'adresse */}
      <div style={{ position: "relative", marginBottom: 8 }}>
        <div style={{ position: "relative" }}>
          <svg
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
            width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--texte-tertiaire)" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={rechercheTexte}
            onChange={handleRechercheChange}
            onFocus={() => suggestions.length > 0 && setSuggestionVisible(true)}
            onBlur={() => setTimeout(() => setSuggestionVisible(false), 180)}
            placeholder="Rechercher une adresse au Maroc…"
            style={inputBaseStyle}
          />
        </div>

        {/* Dropdown suggestions */}
        {suggestionVisible && suggestions.length > 0 && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
            zIndex: 50, background: "var(--fond-secondaire)",
            border: "1px solid var(--bordure)", borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.13)", overflow: "hidden",
          }}>
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onMouseDown={() => choisirSuggestion(s)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  width: "100%", padding: "9px 14px",
                  border: "none", background: "transparent",
                  cursor: "pointer", textAlign: "left",
                  borderBottom: "1px solid var(--bordure-legere)",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--fond-vert-leger)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="var(--primaire)" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--texte-principal)", lineHeight: 1.3 }}>{s.text}</div>
                  <div style={{ fontSize: 11, color: "var(--texte-tertiaire)", marginTop: 1 }}>{s.place_name}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Conteneur de la carte */}
      <div
        ref={containerRef}
        style={{
          height: 360,
          borderRadius: 14,
          overflow: "hidden",
          border: "1.5px solid var(--bordure)",
        }}
      />

      {/* Instruction */}
      <p style={{ fontSize: 12, color: "var(--texte-tertiaire)", textAlign: "center", marginTop: 8 }}>
        Cliquez sur la carte ou déplacez l'épingle pour localiser votre bien
      </p>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function WizardEstimation() {
  const [etape, setEtape] = useState(1);
  const [donnees, setDonnees] = useState<DonneesWizard>(DONNEES_VIDES);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const [utilisateur, setUtilisateur] = useState<User | null>(null);
  const [afficherResultat, setAfficherResultat] = useState(false);
  const [resultat, setResultat] = useState<ResultatEstimation | null | "non_couverte">(null);
  const [contactRecu, setContactRecu] = useState(false);
  const [quartierDetecteNom, setQuartierDetecteNom] = useState<string | null>(null);

  // Vérification de l'auth au montage
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUtilisateur(data.user ?? null);
    });
  }, []);

  function maj<K extends keyof DonneesWizard>(champ: K, valeur: DonneesWizard[K]) {
    setDonnees((d) => ({ ...d, [champ]: valeur }));
    setErreur("");
  }

  function toggleEquipement(id: string) {
    setDonnees((d) => ({
      ...d,
      equipements: d.equipements.includes(id)
        ? d.equipements.filter((e) => e !== id)
        : [...d.equipements, id],
    }));
  }

  // ── Validation ──

  function validerEtape(n: number): string {
    switch (n) {
      case 1:
        if (!donnees.transaction) return "Veuillez choisir le type de transaction.";
        break;
      case 2:
        if (!donnees.typeBien) return "Veuillez sélectionner un type de bien.";
        break;
      case 3:
        if (!donnees.ville) return "Veuillez sélectionner une ville.";
        break;
      case 4: {
        const s = parseFloat(donnees.surface);
        if (!donnees.surface || isNaN(s) || s <= 0) return "Veuillez saisir une surface valide (> 0 m²).";
        break;
      }
      case 5:
        if (!donnees.etat) return "Veuillez indiquer l'état du bien.";
        break;
      case 6:
        if (!donnees.nom.trim()) return "Veuillez saisir votre nom complet.";
        if (!donnees.email.includes("@")) return "Veuillez saisir une adresse email valide.";
        if (!donnees.telephone || donnees.telephone.length < 8) return "Veuillez saisir un numéro de téléphone valide.";
        if (donnees.motDePasse.length < 6) return "Le mot de passe doit contenir au moins 6 caractères.";
        break;
    }
    return "";
  }

  // ── Calcul + sauvegarde ──

  async function calculerEtSauvegarder(user: User) {
    const res = await calculerEstimation({
      ville: donnees.ville,
      quartier: donnees.quartier,
      typeBien: donnees.typeBien,
      transaction: donnees.transaction as Transaction,
      surface: parseFloat(donnees.surface),
      etat: donnees.etat as EtatBien,
      etage: donnees.etage as EtageBien | "",
      equipements: donnees.equipements,
    });

    if (res) {
      const supabase = createClient();
      await supabase.from("estimations").insert({
        user_id: user.id,
        ville: donnees.ville,
        quartier: donnees.quartier || null,
        latitude: donnees.latitude,
        longitude: donnees.longitude,
        type_bien: donnees.typeBien,
        transaction: donnees.transaction,
        surface: parseFloat(donnees.surface),
        chambres: donnees.chambres,
        salles_bain: donnees.sallesBain,
        etat: donnees.etat || null,
        etage: donnees.etage || null,
        equipements: donnees.equipements,
        estimation_basse: res.basse,
        estimation_moyenne: res.moyenne,
        estimation_haute: res.haute,
      });
      setResultat(res);
    } else {
      setResultat("non_couverte");
    }

    setAfficherResultat(true);
    setChargement(false);
  }

  // ── Navigation ──

  async function allerEtapeSuivante() {
    const err = validerEtape(etape);
    if (err) { setErreur(err); return; }
    setErreur("");

    // Étape 5 → si déjà connecté, skip step 6 et calcule directement
    if (etape === 5 && utilisateur) {
      setChargement(true);
      await calculerEtSauvegarder(utilisateur);
      return;
    }

    // Étape 6 → créer le compte puis calculer
    if (etape === 6) {
      setChargement(true);
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: donnees.email,
        password: donnees.motDePasse,
        options: {
          data: { nom: donnees.nom, telephone: donnees.telephone },
        },
      });

      if (error) {
        const msgErreur =
          error.message.includes("already registered")
            ? "Un compte existe déjà avec cet email. Connectez-vous pour continuer."
            : error.message;
        setErreur(msgErreur);
        setChargement(false);
        return;
      }

      if (data.user) {
        await calculerEtSauvegarder(data.user);
      }
      return;
    }

    setEtape((e) => e + 1);
  }

  function etapePrecedente() {
    setErreur("");
    if (etape > 1) setEtape((e) => e - 1);
  }

  // ── Rendu du contenu de chaque étape ──

  function renduEtape() {
    switch (etape) {
      case 1:
        return (
          <div className="flex flex-col gap-5">
            <div>
              <h2
                className="text-2xl font-normal mb-1"
                style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}
              >
                Que souhaitez-vous faire ?
              </h2>
              <p className="text-sm" style={{ color: "var(--texte-secondaire)" }}>
                Le type de transaction détermine la méthode d'estimation.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CarteChoix
                selectionne={donnees.transaction === "vente"}
                onClick={() => maj("transaction", "vente")}
                large
              >
                <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.3">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <path d="M9 22V12h6v10" />
                  <path d="M9 6l3-2 3 2" strokeOpacity="0.5" />
                </svg>
                <span className="text-lg font-semibold" style={{ fontFamily: "var(--font-marcellus), serif" }}>
                  Je veux vendre
                </span>
                <span className="text-xs text-center" style={{ color: "var(--texte-tertiaire)" }}>
                  Estimez la valeur de vente de votre bien
                </span>
              </CarteChoix>

              <CarteChoix
                selectionne={donnees.transaction === "location"}
                onClick={() => maj("transaction", "location")}
                large
              >
                <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.3">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
                <span className="text-lg font-semibold" style={{ fontFamily: "var(--font-marcellus), serif" }}>
                  Je veux louer
                </span>
                <span className="text-xs text-center" style={{ color: "var(--texte-tertiaire)" }}>
                  Estimez le loyer mensuel de votre bien
                </span>
              </CarteChoix>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="flex flex-col gap-5">
            <div>
              <h2
                className="text-2xl font-normal mb-1"
                style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}
              >
                Quel type de bien estimez-vous ?
              </h2>
              <p className="text-sm" style={{ color: "var(--texte-secondaire)" }}>
                Chaque type de bien a ses propres critères de valorisation.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TYPES_BIEN.map((t) => (
                <CarteChoix
                  key={t.id}
                  selectionne={donnees.typeBien === t.id}
                  onClick={() => maj("typeBien", t.id)}
                >
                  {t.icon}
                  <span className="text-sm font-semibold">{t.label}</span>
                </CarteChoix>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="flex flex-col gap-5">
            <div>
              <h2
                className="text-2xl font-normal mb-1"
                style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}
              >
                Où se situe votre bien ?
              </h2>
              <p className="text-sm" style={{ color: "var(--texte-secondaire)" }}>
                Placez l'épingle sur votre bien — l'adresse se remplit automatiquement.
              </p>
            </div>

            {/* Carte Mapbox interactive */}
            <CarteLocalisationEtape
              positionInitiale={
                donnees.latitude && donnees.longitude
                  ? {
                      lat: donnees.latitude,
                      lng: donnees.longitude,
                      ville: donnees.ville,
                      quartier: donnees.quartier,
                      adresseComplete: donnees.adresseComplete,
                      quartierDetecte: false,
                    }
                  : null
              }
              onPosition={(pos) => {
                setDonnees((d) => ({
                  ...d,
                  latitude: pos.lat,
                  longitude: pos.lng,
                  ville: pos.ville || d.ville,
                  quartier: pos.quartier || d.quartier,
                  adresseComplete: pos.adresseComplete,
                }));
                setQuartierDetecteNom(pos.quartierDetecte && pos.quartier ? pos.quartier : null);
                setErreur("");
              }}
            />

            {/* Champs auto-remplis mais modifiables */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Adresse */}
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--texte-corps)" }}>
                  Adresse{" "}
                  <span className="font-normal text-xs" style={{ color: "var(--texte-tertiaire)" }}>
                    (auto-remplie par la carte)
                  </span>
                </label>
                <input
                  type="text"
                  value={donnees.adresseComplete}
                  onChange={(e) => maj("adresseComplete", e.target.value)}
                  placeholder="Placez d'abord l'épingle sur la carte…"
                  className="w-full rounded-xl px-4 text-sm outline-none transition-all"
                  style={{
                    height: 44,
                    border: "1.5px solid var(--bordure)",
                    color: "var(--texte-principal)",
                    background: "var(--fond-secondaire)",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "var(--primaire)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "var(--bordure)"; }}
                />
              </div>

              {/* Ville */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--texte-corps)" }}>
                  Ville <span style={{ color: "#B91C1C" }}>*</span>
                </label>
                <select
                  value={donnees.ville}
                  onChange={(e) => maj("ville", e.target.value)}
                  className="w-full rounded-xl px-4 text-sm outline-none appearance-none cursor-pointer"
                  style={{
                    height: 44,
                    border: `1.5px solid ${donnees.ville ? "var(--primaire)" : "var(--bordure)"}`,
                    color: donnees.ville ? "var(--texte-principal)" : "var(--texte-pale)",
                    background: "var(--fond-secondaire)",
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' viewBox='0 0 24 24' stroke='%239DB8AD' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 12px center",
                  }}
                >
                  <option value="">Sélectionnez une ville</option>
                  {VILLES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              {/* Quartier */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium" style={{ color: "var(--texte-corps)" }}>
                    Quartier{" "}
                    <span className="font-normal text-xs" style={{ color: "var(--texte-tertiaire)" }}>
                      (optionnel)
                    </span>
                  </label>
                  {/* Badge discret : quartier auto-détecté depuis notre BDD */}
                  {quartierDetecteNom && donnees.quartier === quartierDetecteNom && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 10,
                        fontWeight: 500,
                        color: "var(--primaire)",
                        background: "var(--fond-vert-leger)",
                        border: "1px solid rgba(15,76,58,0.18)",
                        borderRadius: 20,
                        padding: "2px 8px",
                      }}
                    >
                      <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="10" r="3" />
                        <path d="M12 2a8 8 0 0 0-8 8c0 5.6 8 12 8 12s8-6.4 8-12a8 8 0 0 0-8-8z" />
                      </svg>
                      Détecté automatiquement
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={donnees.quartier}
                  onChange={(e) => {
                    maj("quartier", e.target.value);
                    // Efface le badge dès que l'utilisateur modifie manuellement
                    if (e.target.value !== quartierDetecteNom) setQuartierDetecteNom(null);
                  }}
                  placeholder="Ex : Maarif, Guéliz, Agdal…"
                  className="w-full rounded-xl px-4 text-sm outline-none transition-all"
                  style={{
                    height: 44,
                    border: `1.5px solid ${quartierDetecteNom && donnees.quartier === quartierDetecteNom ? "var(--primaire-clair)" : "var(--bordure)"}`,
                    color: "var(--texte-principal)",
                    background: "var(--fond-secondaire)",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "var(--primaire)"; }}
                  onBlur={(e) => {
                    e.target.style.borderColor =
                      quartierDetecteNom && donnees.quartier === quartierDetecteNom
                        ? "var(--primaire-clair)"
                        : "var(--bordure)";
                  }}
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="flex flex-col gap-5">
            <div>
              <h2
                className="text-2xl font-normal mb-1"
                style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}
              >
                Surface et pièces
              </h2>
              <p className="text-sm" style={{ color: "var(--texte-secondaire)" }}>
                La surface est la base du calcul d'estimation.
              </p>
            </div>

            {/* Surface */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "var(--texte-corps)" }}>
                Surface habitable <span style={{ color: "#B91C1C" }}>*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="9999"
                  value={donnees.surface}
                  onChange={(e) => maj("surface", e.target.value)}
                  placeholder="150"
                  className="w-full rounded-xl px-4 pr-14 text-base outline-none transition-all"
                  style={{
                    height: 56,
                    border: "1.5px solid #EDE7D7",
                    color: "var(--texte-principal)",
                    background: "var(--fond-secondaire)",
                    fontSize: "1.1rem",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--primaire)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(15,76,58,0.08)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--bordure)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <span
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                  style={{ color: "var(--texte-tertiaire)" }}
                >
                  m²
                </span>
              </div>
            </div>

            {/* Compteurs */}
            <div
              className="rounded-2xl px-5 py-1"
              style={{ background: "var(--fond-principal)", border: "1px solid #EDE7D7" }}
            >
              <Compteur
                label="Chambres"
                valeur={donnees.chambres}
                onChange={(v) => maj("chambres", v)}
                min={0}
                max={15}
              />
              <Compteur
                label="Salles de bain"
                valeur={donnees.sallesBain}
                onChange={(v) => maj("sallesBain", v)}
                min={0}
                max={10}
              />
            </div>
          </div>
        );

      case 5: {
        const estAppartement = donnees.typeBien === "Appartement";
        return (
          <div className="flex flex-col gap-6">
            <div>
              <h2
                className="text-2xl font-normal mb-1"
                style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}
              >
                État et équipements
              </h2>
              <p className="text-sm" style={{ color: "var(--texte-secondaire)" }}>
                Ces critères ajustent la valorisation de votre bien.
              </p>
            </div>

            {/* État du bien */}
            <div>
              <p className="text-sm font-semibold mb-3" style={{ color: "var(--texte-corps)" }}>
                État du bien <span style={{ color: "#B91C1C" }}>*</span>
              </p>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { id: "neuf", label: "Neuf", desc: "+10%" },
                  { id: "bon_etat", label: "Bon état", desc: "Référence" },
                  { id: "a_renover", label: "À rénover", desc: "−15%" },
                ] as const).map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => maj("etat", e.id)}
                    className="flex flex-col items-center gap-1 rounded-xl py-4 border-2 transition-all cursor-pointer"
                    style={{
                      borderColor: donnees.etat === e.id ? "var(--primaire)" : "var(--bordure)",
                      background: donnees.etat === e.id ? "var(--fond-vert-leger)" : "var(--fond-secondaire)",
                      color: donnees.etat === e.id ? "var(--primaire)" : "#4A5A50",
                    }}
                  >
                    <span className="text-sm font-semibold">{e.label}</span>
                    <span
                      className="text-xs"
                      style={{ color: donnees.etat === e.id ? "var(--primaire-clair)" : "#B4AD97" }}
                    >
                      {e.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Étage (seulement pour appartement) */}
            {estAppartement && (
              <div>
                <p className="text-sm font-semibold mb-3" style={{ color: "var(--texte-corps)" }}>
                  Étage
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { id: "rdc", label: "RDC", desc: "−5%" },
                    { id: "intermediaire", label: "Intermédiaire", desc: "Référence" },
                    { id: "dernier", label: "Dernier étage", desc: "+5%" },
                  ] as const).map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => maj("etage", e.id)}
                      className="flex flex-col items-center gap-1 rounded-xl py-4 border-2 transition-all cursor-pointer"
                      style={{
                        borderColor: donnees.etage === e.id ? "var(--primaire)" : "var(--bordure)",
                        background: donnees.etage === e.id ? "var(--fond-vert-leger)" : "var(--fond-secondaire)",
                        color: donnees.etage === e.id ? "var(--primaire)" : "#4A5A50",
                      }}
                    >
                      <span className="text-xs font-semibold text-center leading-tight">{e.label}</span>
                      <span
                        className="text-xs"
                        style={{ color: donnees.etage === e.id ? "var(--primaire-clair)" : "#B4AD97" }}
                      >
                        {e.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Équipements */}
            <div>
              <p className="text-sm font-semibold mb-3" style={{ color: "var(--texte-corps)" }}>
                Équipements valorisants{" "}
                <span className="font-normal text-xs" style={{ color: "var(--texte-tertiaire)" }}>
                  (sélectionnez tout ce qui s'applique)
                </span>
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {EQUIPEMENTS.map((eq) => {
                  const actif = donnees.equipements.includes(eq.id);
                  return (
                    <button
                      key={eq.id}
                      type="button"
                      onClick={() => toggleEquipement(eq.id)}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 border-2 transition-all text-left cursor-pointer"
                      style={{
                        borderColor: actif ? "var(--primaire)" : "var(--bordure)",
                        background: actif ? "var(--fond-vert-leger)" : "var(--fond-secondaire)",
                        color: actif ? "var(--primaire)" : "#4A5A50",
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
                        style={{
                          background: actif ? "var(--primaire)" : "transparent",
                          border: `1.5px solid ${actif ? "var(--primaire)" : "var(--texte-pale)"}`,
                        }}
                      >
                        {actif && (
                          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-medium">{eq.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }

      case 6:
        return (
          <div className="flex flex-col gap-5">
            {/* Titre */}
            <div
              className="rounded-2xl p-5 flex items-start gap-4"
              style={{ background: "linear-gradient(135deg, #F0FAF4 0%, #E8F5EE 100%)", border: "1px solid #C8E6D4" }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--primaire)" }}
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--texte-sur-primaire)" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                {/* Carte englobante en dégradé fixe (#F0FAF4/#E8F5EE, jamais
                    sombre) : titre en vert fixe pour garder un fort contraste
                    même quand var(--primaire) devient or en mode sombre. */}
                <p className="text-base font-semibold" style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}>
                  Créez votre compte pour découvrir l'estimation de votre bien
                </p>
                <p className="text-xs mt-1" style={{ color: "#6B9E7A" }}>
                  Votre estimation sera sauvegardée et accessible depuis votre espace personnel.
                </p>
              </div>
            </div>

            {/* Formulaire */}
            <div className="flex flex-col gap-4">
              <ChampTexte
                label="Nom complet"
                valeur={donnees.nom}
                onChange={(v) => maj("nom", v)}
                placeholder="Mohammed Alami"
                autoComplete="name"
              />
              <ChampTexte
                label="Adresse email"
                type="email"
                valeur={donnees.email}
                onChange={(v) => maj("email", v)}
                placeholder="votre@email.com"
                autoComplete="email"
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--texte-corps)" }}>
                  Téléphone
                </label>
                <ChampTelephone
                  valeur={donnees.telephone}
                  onChange={(v) => maj("telephone", v)}
                />
              </div>

              <ChampTexte
                label="Mot de passe"
                type="password"
                valeur={donnees.motDePasse}
                onChange={(v) => maj("motDePasse", v)}
                placeholder="Min. 6 caractères"
                autoComplete="new-password"
              />
            </div>

            <p className="text-xs" style={{ color: "var(--texte-tertiaire)" }}>
              Déjà un compte ?{" "}
              <Link href="/connexion" className="font-medium hover:underline" style={{ color: "var(--primaire)" }}>
                Se connecter
              </Link>
            </p>
          </div>
        );

      default:
        return null;
    }
  }

  // ── Résultat : zone non couverte ──

  if (afficherResultat && resultat === "non_couverte") {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-start justify-center py-12 px-4">
        <div
          className="w-full max-w-xl rounded-3xl overflow-hidden text-center"
          style={{ background: "var(--fond-secondaire)", boxShadow: "0 8px 40px rgba(15,76,58,0.12)" }}
        >
          <div
            className="px-8 py-10"
            style={{ background: "linear-gradient(135deg, #0F4C3A 0%, #146C43 100%)" }}
          >
            <div
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h2
              className="text-2xl font-normal text-white mb-2"
              style={{ fontFamily: "var(--font-marcellus), serif" }}
            >
              Un conseiller vous recontactera
            </h2>
            <p className="text-white/75 text-sm">
              La zone{" "}
              <strong className="text-white">
                {donnees.quartier ? `${donnees.quartier}, ` : ""}{donnees.ville}
              </strong>{" "}
              n'est pas encore couverte par notre grille de prix automatique.
            </p>
          </div>
          <div className="p-8">
            <p className="text-sm mb-6" style={{ color: "var(--texte-secondaire)" }}>
              Un conseiller HOOMY spécialisé dans votre secteur vous contactera dans les{" "}
              <strong style={{ color: "var(--primaire)" }}>24 heures</strong> pour vous fournir une estimation précise et personnalisée.
            </p>
            <div
              className="rounded-2xl p-5 mb-6 text-left"
              style={{ background: "var(--fond-principal)", border: "1px solid #EDE7D7" }}
            >
              <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "var(--texte-tertiaire)" }}>
                Récapitulatif de votre demande
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ["Type", `${donnees.typeBien} · ${donnees.transaction === "vente" ? "Vente" : "Location"}`],
                  ["Localisation", `${donnees.quartier ? donnees.quartier + ", " : ""}${donnees.ville}`],
                  ["Surface", `${donnees.surface} m²`],
                  ["Pièces", `${donnees.chambres} ch. · ${donnees.sallesBain} SDB`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <span style={{ color: "var(--texte-tertiaire)" }}>{k}</span>
                    <p className="font-medium mt-0.5" style={{ color: "var(--texte-principal)" }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium"
              style={{ color: "var(--primaire)" }}
            >
              ← Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Résultat : estimation disponible ──

  if (afficherResultat && resultat && resultat !== "non_couverte") {
    const r = resultat;
    const pct = ((r.moyenne - r.basse) / Math.max(r.haute - r.basse, 1)) * 100;
    const recapEquipements = EQUIPEMENTS.filter((e) => donnees.equipements.includes(e.id))
      .map((e) => e.label)
      .join(", ");

    return (
      <div className="min-h-[calc(100vh-80px)] flex items-start justify-center py-12 px-4">
        <div
          className="w-full max-w-2xl rounded-3xl overflow-hidden"
          style={{ background: "var(--fond-secondaire)", boxShadow: "0 8px 40px rgba(15,76,58,0.14)" }}
        >
          {/* En-tête résultat */}
          <div
            className="px-8 py-7"
            style={{ background: "linear-gradient(135deg, #0F4C3A 0%, #1a5c45 100%)" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(212,175,55,0.25)", border: "1.5px solid rgba(212,175,55,0.5)" }}
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-sm font-medium text-white/80">Estimation réalisée avec succès</p>
            </div>
            <h2
              className="text-3xl font-normal text-white leading-tight"
              style={{ fontFamily: "var(--font-marcellus), serif" }}
            >
              Votre bien est estimé entre
            </h2>
            <p className="mt-1 text-white/65 text-sm">
              {donnees.typeBien} ·{" "}
              {donnees.quartier ? `${donnees.quartier}, ` : ""}
              {donnees.ville}
            </p>
          </div>

          <div className="p-8">
            {/* Fourchette haute + basse */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--texte-tertiaire)" }}>Estimation basse</p>
                <p className="text-lg font-semibold" style={{ color: "#4A5A50" }}>
                  {formatPrix(r.basse)}
                  {donnees.transaction === "location" && (
                    <span className="text-sm font-normal">/mois</span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs mb-1" style={{ color: "var(--texte-tertiaire)" }}>Estimation haute</p>
                <p className="text-lg font-semibold" style={{ color: "#4A5A50" }}>
                  {formatPrix(r.haute)}
                  {donnees.transaction === "location" && (
                    <span className="text-sm font-normal">/mois</span>
                  )}
                </p>
              </div>
            </div>

            {/* Barre gradient avec marqueur */}
            <div className="relative mb-6">
              <div
                className="h-3 rounded-full"
                style={{ background: "linear-gradient(90deg, #E8E4D9 0%, #C8E6D4 40%, #0F4C3A 100%)" }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white"
                style={{
                  left: `clamp(8px, calc(${pct}% - 10px), calc(100% - 18px))`,
                  background: "var(--accent)",
                  boxShadow: "0 2px 8px rgba(212,175,55,0.45)",
                }}
              />
            </div>

            {/* Estimation centrale en or */}
            <div
              className="rounded-2xl p-6 text-center mb-6"
              style={{
                background: "linear-gradient(135deg, #FFFBF0 0%, #FFF8E7 100%)",
                border: "1.5px solid rgba(212,175,55,0.3)",
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#9B8540" }}>
                Estimation centrale
              </p>
              <p
                className="leading-none"
                style={{
                  fontFamily: "var(--font-marcellus), serif",
                  fontSize: "clamp(1.8rem, 5vw, 2.6rem)",
                  color: "var(--accent)",
                }}
              >
                {formatPrix(r.moyenne)}
                {donnees.transaction === "location" && (
                  <span
                    className="ml-1 text-lg font-normal"
                    style={{ color: "#B89A2E" }}
                  >
                    /mois
                  </span>
                )}
              </p>
              <p className="text-xs mt-2" style={{ color: "#B89A2E" }}>
                soit {formatPrix(r.prixM2Moyen)} / m²
              </p>
            </div>

            {/* Récapitulatif */}
            <div
              className="rounded-2xl p-5 mb-6"
              style={{ background: "var(--fond-principal)", border: "1px solid #EDE7D7" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--texte-tertiaire)" }}>
                Récapitulatif de l'estimation
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  ["Type de bien", donnees.typeBien],
                  ["Transaction", donnees.transaction === "vente" ? "Vente" : "Location"],
                  ["Localisation", `${donnees.quartier ? donnees.quartier + ", " : ""}${donnees.ville}`],
                  ["Surface", `${donnees.surface} m²`],
                  ["Pièces", `${donnees.chambres} ch. · ${donnees.sallesBain} SDB`],
                  ["État", donnees.etat === "neuf" ? "Neuf" : donnees.etat === "bon_etat" ? "Bon état" : "À rénover"],
                  ...(donnees.etage ? [["Étage", donnees.etage === "rdc" ? "RDC" : donnees.etage === "dernier" ? "Dernier étage" : "Intermédiaire"]] : []),
                  ...(recapEquipements ? [["Équipements", recapEquipements]] : []),
                ].map(([k, v]) => (
                  <div key={k} className={k === "Localisation" || k === "Équipements" ? "col-span-2" : ""}>
                    <span className="text-xs" style={{ color: "var(--texte-tertiaire)" }}>{k}</span>
                    <p className="font-medium mt-0.5" style={{ color: "var(--texte-principal)" }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <p
              className="text-xs leading-relaxed mb-6 flex gap-2"
              style={{ color: "var(--texte-tertiaire)" }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Estimation indicative basée sur les prix du marché dans la zone{" "}
              <strong style={{ color: "var(--texte-secondaire)" }}>{r.zone}</strong>. Pour une estimation précise et gratuite,
              un conseiller HOOMY peut visiter votre bien.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/publier?ville=${encodeURIComponent(donnees.ville)}&type=${encodeURIComponent(donnees.typeBien)}&transaction=${donnees.transaction}`}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-colors"
                style={{ background: "var(--primaire)", color: "var(--fond-secondaire)" }}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12l7-7 7 7" />
                </svg>
                Publier ce bien
              </Link>

              {contactRecu ? (
                <div
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-medium"
                  style={{ background: "var(--fond-vert-leger)", color: "var(--primaire)", border: "1.5px solid #C8E6D4" }}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Demande envoyée !
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setContactRecu(true)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all"
                  style={{
                    border: "1.5px solid #D4AF37",
                    color: "#9B8540",
                    background: "transparent",
                  }}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.44 2 2 0 0 1 3.6 1.26h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6.06 6.06l1.07-.93a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  Être recontacté
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Wizard (étapes 1–6) ──

  const estDerniereEtape = etape === 5 && !!utilisateur;
  const libelleBouton = chargement
    ? "Calcul en cours…"
    : estDerniereEtape || etape === 6
    ? "Calculer mon estimation"
    : "Suivant";

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-start justify-center py-10 px-4 pb-24">
      <div
        className="w-full max-w-2xl rounded-3xl overflow-hidden"
        style={{ boxShadow: "0 8px 40px rgba(15,76,58,0.12)" }}
      >
        {/* En-tête */}
        <div
          className="px-8 py-7"
          style={{ background: "linear-gradient(135deg, #0F4C3A 0%, #146C43 100%)" }}
        >
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-2"
            style={{ color: "var(--accent)", letterSpacing: "0.15em" }}
          >
            HOOMY.MA
          </p>
          <h1
            className="text-2xl font-normal text-white leading-snug"
            style={{ fontFamily: "var(--font-marcellus), serif" }}
          >
            Estimez votre bien immobilier
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.65)" }}>
            Estimation gratuite basée sur les prix réels du marché
          </p>
        </div>

        {/* Zone blanche : barre + contenu + nav */}
        <div style={{ background: "var(--fond-secondaire)" }}>
          <BarreProgression etape={etape} />

          {/* Contenu de l'étape */}
          <div className="px-8 pt-6 pb-2">{renduEtape()}</div>

          {/* Message d'erreur */}
          {erreur && (
            <div className="px-8 mt-4">
              <AlerteErreur message={erreur} />
            </div>
          )}

          {/* Navigation */}
          <div
            className="flex items-center justify-between px-8 py-6 mt-4"
            style={{ borderTop: "1px solid #F0EDE5" }}
          >
            <button
              type="button"
              onClick={etapePrecedente}
              disabled={etape === 1 || chargement}
              className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all disabled:opacity-30"
              style={{
                border: "1.5px solid #EDE7D7",
                color: "#4A5A50",
                background: "transparent",
              }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Précédent
            </button>

            <button
              type="button"
              onClick={allerEtapeSuivante}
              disabled={chargement}
              className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all disabled:opacity-60"
              style={{
                background: chargement ? "#6B9E7A" : "linear-gradient(135deg, #0F4C3A 0%, #146C43 100%)",
                // Fond toujours vert, fixe : var(--fond-secondaire) deviendrait
                // vert nuit foncé en mode sombre → texte quasi invisible sur
                // son propre bouton. Blanc fixe, comme le reste de cet en-tête.
                color: "#fff",
                boxShadow: chargement ? "none" : "0 4px 14px rgba(15,76,58,0.3)",
              }}
            >
              {chargement && (
                <svg className="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {libelleBouton}
              {!chargement && (
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
