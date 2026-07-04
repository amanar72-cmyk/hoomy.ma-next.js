"use client";

// Carte Mapbox des listes /acheter et /louer.
// Chargée UNIQUEMENT via dynamic import à l'ouverture du panneau (0 Ko sinon).
// Ne reçoit que des coordonnées APPROXIMATIVES (floutées côté serveur) :
// cercles de zone, jamais de pin exact.

import "mapbox-gl/dist/mapbox-gl.css";
import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import MapGL, { Marker, NavigationControl, GeolocateControl } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import Link from "next/link";
import { formaterPrix } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { afficherToast } from "@/components/ui/Toaster";
import type { PointCarte } from "@/lib/types";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// Prix compact pour la pilule du marqueur : « 3,2M DH », « 480K DH », « 5K DH/mois ».
function prixCourt(prix: number, transaction: string): string {
  let s: string;
  if (prix >= 1_000_000) {
    const m = Math.round((prix / 1_000_000) * 10) / 10;
    s = m.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + "M";
  } else if (prix >= 1000) {
    s = Math.round(prix / 1000) + "K";
  } else {
    s = String(prix);
  }
  return `${s} DH${transaction === "location" ? "/mois" : ""}`;
}

// Clustering léger côté client (zéro dépendance) : on projette chaque point
// flouté en pixels et on regroupe par cellules de CELL px. Recalculé à chaque
// fin de déplacement/zoom. Suffisant pour des dizaines à centaines de biens.
const CELL = 64;
type Amas = { key: string; lng: number; lat: number; count: number; points: PointCarte[] };

type Props = {
  points: PointCarte[];
  // Notifie le parent quand le panneau coulissant s'ouvre/ferme (pour masquer
  // le bouton « Voir en liste » et éviter le chevauchement).
  onFeuille?: (ouverte: boolean) => void;
};

export default function CarteBiens({ points, onFeuille }: Props) {
  const mapRef = useRef<MapRef>(null);
  const conteneurRef = useRef<HTMLDivElement>(null);
  const carrouselRef = useRef<HTMLDivElement>(null);
  // Biens affichés dans le panneau coulissant (bottom-sheet), ou null si fermé
  const [feuille, setFeuille] = useState<PointCarte[] | null>(null);
  // Fondu depuis l'aperçu statique une fois la carte interactive prête
  const [prete, setPrete] = useState(false);
  // Bascule Normal / Satellite
  const [satellite, setSatellite] = useState(false);
  const mapStyle = satellite
    ? "mapbox://styles/mapbox/satellite-streets-v12"
    : "mapbox://styles/mapbox/streets-v12";

  // Mapbox a besoin de dimensions stables : le canvas s'initialise parfois avant
  // que le panneau (flex-1 + animation d'ouverture) ait sa taille finale, d'où
  // une carte « déformée ». On force resize() dès que le conteneur est mesuré
  // puis à chaque changement de taille (ouverture desktop, plein écran mobile,
  // redimensionnement fenêtre). Le callback se déclenche aussi immédiatement à
  // l'observation → corrige la forme initiale.
  useEffect(() => {
    const el = conteneurRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Amas recalculés à chaque déplacement/zoom (et à l'arrivée des biens)
  const [amas, setAmas] = useState<Amas[]>([]);
  const recalculer = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const cellules = new Map<string, { slng: number; slat: number; membres: PointCarte[] }>();
    for (const p of points) {
      const px = map.project([p.lngApprox, p.latApprox]);
      const cle = `${Math.floor(px.x / CELL)}:${Math.floor(px.y / CELL)}`;
      const c = cellules.get(cle);
      if (c) { c.slng += p.lngApprox; c.slat += p.latApprox; c.membres.push(p); }
      else cellules.set(cle, { slng: p.lngApprox, slat: p.latApprox, membres: [p] });
    }
    const out: Amas[] = [];
    for (const [cle, c] of cellules) {
      out.push({
        key: cle,
        lng: c.slng / c.membres.length,
        lat: c.slat / c.membres.length,
        count: c.membres.length,
        points: c.membres,
      });
    }
    setAmas(out);
  }, [points]);

  // Recalcule quand les biens changent (une fois la carte prête)
  useEffect(() => { recalculer(); }, [recalculer]);

  // Notifie le parent de l'ouverture/fermeture du panneau
  useEffect(() => { onFeuille?.(feuille !== null); }, [feuille, onFeuille]);

  // Ouvre le panneau sur un amas + recentre la carte
  const ouvrirFeuille = useCallback((a: Amas) => {
    setFeuille(a.points);
    const map = mapRef.current;
    if (!map) return;
    const zoom = a.count === 1 ? Math.max(map.getZoom(), 13.5) : map.getZoom();
    map.easeTo({ center: [a.lng, a.lat], zoom, duration: 450, padding: { bottom: 260 } });
  }, []);

  // Cadrage initial sur l'ensemble des biens
  const bounds = useMemo(() => {
    const lats = points.map((p) => p.latApprox);
    const lngs = points.map((p) => p.lngApprox);
    return [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ] as [[number, number], [number, number]];
  }, [points]);

  const cheminBien = (p: PointCarte) =>
    `/${p.transaction === "location" ? "louer" : "acheter"}/${p.slug ?? p.id}`;

  return (
    <div
      ref={conteneurRef}
      className="w-full h-full relative"
      style={{ opacity: prete ? 1 : 0, transition: "opacity 0.5s ease" }}
    >
    {/* Toggle Normal / Satellite — haut gauche, style HOOMY */}
    <button
      type="button"
      onClick={() => setSatellite((s) => !s)}
      aria-label={satellite ? "Vue plan" : "Vue satellite"}
      className="absolute z-10 top-3 left-3 text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer transition-all hover:shadow-md"
      style={{
        background: satellite ? "#0F4C3A" : "rgba(255,255,255,0.95)",
        color: satellite ? "#fff" : "#0F4C3A",
        border: "1px solid rgba(15,76,58,0.15)",
        boxShadow: "0 2px 10px rgba(15,76,58,0.15)",
        backdropFilter: "blur(6px)",
      }}
    >
      {satellite ? "Plan" : "Satellite"}
    </button>

    <MapGL
      ref={mapRef}
      mapboxAccessToken={TOKEN}
      mapStyle={mapStyle}
      initialViewState={{ bounds, fitBoundsOptions: { padding: 70, maxZoom: 14 } }}
      style={{ width: "100%", height: "100%" }}
      onLoad={() => { setPrete(true); mapRef.current?.resize(); recalculer(); }}
      onMoveEnd={recalculer}
      onClick={() => setFeuille(null)}
      attributionControl={false}
    >
      <NavigationControl position="top-right" showCompass={false} />
      {/* Géolocalisation — « me centrer sur ma position » */}
      <GeolocateControl
        position="top-right"
        showAccuracyCircle={false}
        trackUserLocation={false}
        positionOptions={{ enableHighAccuracy: true }}
      />

      {/* Marqueurs : pilule de prix (bien seul) ou bulle de cluster.
          Positionnés sur les coordonnées FLOUTÉES — jamais la position exacte. */}
      {amas.map((a) =>
        a.count === 1 ? (
          <Marker
            key={a.key}
            longitude={a.lng}
            latitude={a.lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              ouvrirFeuille(a);
            }}
          >
            <div
              className="pilule-prix"
              style={
                feuille?.some((p) => p.id === a.points[0].id)
                  ? { background: "#D4AF37", color: "#0F4C3A" }
                  : { background: "#0F4C3A", color: "#fff" }
              }
            >
              {prixCourt(a.points[0].prix, a.points[0].transaction)}
            </div>
          </Marker>
        ) : (
          <Marker
            key={a.key}
            longitude={a.lng}
            latitude={a.lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              ouvrirFeuille(a);
            }}
          >
            <div
              className="bulle-cluster"
              style={
                feuille && a.points.some((p) => feuille.some((f) => f.id === p.id))
                  ? { background: "#D4AF37", color: "#0F4C3A" }
                  : undefined
              }
            >
              {a.count}
            </div>
          </Marker>
        )
      )}

      {/* Styles des marqueurs pilule/cluster + panneau coulissant */}
      <style jsx global>{`
        .pilule-prix {
          font-size: 12px;
          font-weight: 700;
          line-height: 1;
          padding: 6px 11px;
          border-radius: 999px;
          white-space: nowrap;
          cursor: pointer;
          border: 1.5px solid #D4AF37;
          box-shadow: 0 3px 12px rgba(15, 76, 58, 0.28);
          transition: transform 0.15s ease;
          user-select: none;
        }
        .pilule-prix:hover {
          transform: scale(1.06);
        }
        .bulle-cluster {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 38px;
          height: 38px;
          padding: 0 6px;
          border-radius: 999px;
          background: #0F4C3A;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          border: 2px solid #D4AF37;
          box-shadow: 0 4px 14px rgba(15, 76, 58, 0.32);
          user-select: none;
        }
        /* ── Panneau coulissant (bottom-sheet) ─────────────────────────── */
        .feuille-carte {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 20;
          padding: 10px 0 calc(14px + env(safe-area-inset-bottom)) 0;
          background: linear-gradient(to top, rgba(237,243,239,0.98) 60%, rgba(237,243,239,0));
          animation: feuille-monte 0.32s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes feuille-monte {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .feuille-piste {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scroll-behavior: smooth;
          padding: 0 16px 6px 16px;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .feuille-piste::-webkit-scrollbar { display: none; }
        .feuille-item {
          scroll-snap-align: center;
          flex: 0 0 auto;
        }
        .feuille-fleche {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 21;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: #fff;
          color: #0F4C3A;
          border: 1px solid rgba(15,76,58,0.14);
          box-shadow: 0 3px 12px rgba(15,76,58,0.2);
          cursor: pointer;
        }
        @media (prefers-reduced-motion: reduce) {
          .pilule-prix { transition: none; }
          .pilule-prix:hover { transform: none; }
          .feuille-carte { animation: none; }
          .feuille-piste { scroll-behavior: auto; }
        }
      `}</style>
    </MapGL>

    {/* Panneau coulissant : carrousel horizontal des biens de l'amas cliqué */}
    {feuille && (
      <div className="feuille-carte">
        {/* Fermer */}
        <button
          type="button"
          onClick={() => setFeuille(null)}
          aria-label="Fermer"
          className="absolute z-30 -top-1 right-3 flex items-center justify-center cursor-pointer"
          style={{
            width: 34, height: 34, borderRadius: 999,
            background: "#fff", color: "#0F4C3A",
            border: "1px solid rgba(15,76,58,0.14)",
            boxShadow: "0 3px 12px rgba(15,76,58,0.2)",
          }}
        >
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>

        {feuille.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => carrouselRef.current?.scrollBy({ left: -240, behavior: "smooth" })}
              aria-label="Bien précédent"
              className="feuille-fleche"
              style={{ left: 6 }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button
              type="button"
              onClick={() => carrouselRef.current?.scrollBy({ left: 240, behavior: "smooth" })}
              aria-label="Bien suivant"
              className="feuille-fleche"
              style={{ right: 6 }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </>
        )}

        <div ref={carrouselRef} className="feuille-piste">
          {feuille.map((p) => (
            <div key={p.id} className="feuille-item">
              <CarteFeuille point={p} chemin={cheminBien(p)} />
            </div>
          ))}
        </div>
      </div>
    )}
    </div>
  );
}

// ── Carte d'un bien dans le carrousel du panneau coulissant ──────────────────
function CarteFeuille({ point, chemin }: { point: PointCarte; chemin: string }) {
  const [favori, setFavori] = useState(false);
  const userIdRef = useRef<string | null>(null);

  // Charge l'état favori si l'utilisateur est connecté
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      userIdRef.current = user.id;
      supabase
        .from("favoris")
        .select("id")
        .eq("user_id", user.id)
        .eq("bien_id", point.id)
        .maybeSingle()
        .then(({ data }) => { if (data) setFavori(true); });
    });
  }, [point.id]);

  async function toggleFavori(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const uid = userIdRef.current;
    if (!uid) {
      afficherToast("Connectez-vous pour sauvegarder vos favoris", {
        lien: "/connexion",
        libelleLien: "Se connecter",
      });
      return;
    }
    const supabase = createClient();
    afficherToast(favori ? "Retiré des favoris" : "Ajouté aux favoris");
    if (!favori) {
      await supabase.from("favoris").insert({ user_id: uid, bien_id: point.id });
    } else {
      await supabase.from("favoris").delete().eq("user_id", uid).eq("bien_id", point.id);
    }
    setFavori(!favori);
  }

  return (
    <Link
      href={chemin}
      style={{ textDecoration: "none", color: "inherit", display: "block", width: 236 }}
    >
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{ background: "#fff", boxShadow: "0 10px 30px rgba(15,76,58,0.2)", border: "1px solid rgba(15,76,58,0.08)" }}
      >
        {/* Cœur favori */}
        <button
          type="button"
          onClick={toggleFavori}
          aria-label={favori ? "Retirer des favoris" : "Ajouter aux favoris"}
          aria-pressed={favori}
          className="absolute z-10 top-2.5 right-2.5 flex items-center justify-center cursor-pointer"
          style={{
            width: 34, height: 34, borderRadius: 999,
            background: favori ? "rgba(212,175,55,0.18)" : "rgba(255,255,255,0.92)",
            outline: favori ? "1.5px solid rgba(212,175,55,0.4)" : "none",
            boxShadow: "0 2px 8px rgba(15,76,58,0.18)",
            backdropFilter: "blur(4px)",
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24"
            fill={favori ? "#D4AF37" : "none"}
            stroke={favori ? "#D4AF37" : "#0F4C3A"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
        </button>

        <div style={{ height: 132, background: "#F4F6F5", overflow: "hidden" }}>
          {point.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={point.photo} alt={point.titre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#C4D8CE" strokeWidth="1.2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
            </div>
          )}
        </div>
        <div className="px-3.5 py-3">
          <p className="text-sm font-semibold mb-1" style={{ color: "#0F4C3A", fontFamily: "var(--font-marcellus), serif" }}>
            {formaterPrix(point.prix, point.transaction)}
          </p>
          <p className="text-xs line-clamp-2 mb-1.5" style={{ color: "#3D4A42" }}>
            {point.titre}
          </p>
          <span className="text-xs font-medium" style={{ color: "#D4AF37" }}>
            Voir la fiche →
          </span>
        </div>
      </div>
    </Link>
  );
}
