"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { FiltresActifs } from "@/lib/types";
import { LISTE_VILLES_ACTIVES } from "@/lib/villes";

// Diffusion publique limitée aux villes actives (source : src/lib/villes.ts)
const VILLES = LISTE_VILLES_ACTIVES;
const TYPES = ["Appartement", "Maison", "Villa", "Riad", "Bureau", "Local commercial", "Terrain"];
const CHAMBRES = ["1", "2", "3", "4", "5+"];

type Props = {
  defaultFiltres: FiltresActifs;
  total: number;
};

export default function FiltresBar({ defaultFiltres, total }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  // Barre repliée par défaut (minimaliste). Le panneau détaillé s'ouvre au clic.
  const [ouvert, setOuvert] = useState(false);

  // État local initialisé depuis les props serveur ; le composant est remonté
  // via key={} à chaque navigation, donc les valeurs restent synchronisées.
  const [ville, setVille] = useState(defaultFiltres.ville);
  // quartier : préservé dans l'URL mais non exposé dans cette barre de filtres
  const quartier = defaultFiltres.quartier;
  const [type, setType] = useState(defaultFiltres.type);
  const [prixMin, setPrixMin] = useState(defaultFiltres.prixMin);
  const [prixMax, setPrixMax] = useState(defaultFiltres.prixMax);
  const [chambres, setChambres] = useState(defaultFiltres.chambres);

  function filtrer() {
    const params = new URLSearchParams();
    if (ville) params.set("ville", ville);
    if (quartier) params.set("quartier", quartier); // préservé si venu du hero
    if (type) params.set("type", type);
    if (prixMin) params.set("prixMin", prixMin);
    if (prixMax) params.set("prixMax", prixMax);
    if (chambres) params.set("chambres", chambres);
    if (defaultFiltres.tri) params.set("tri", defaultFiltres.tri);
    setOuvert(false); // on replie après application
    router.push(`${pathname}?${params.toString()}`);
  }

  // Résumé compact des filtres actifs (affiché barre repliée).
  const resume: string[] = [
    ville || null,
    type || null,
    prixMin ? `dès ${Number(prixMin).toLocaleString("fr-FR")} DH` : null,
    prixMax ? `jusqu'à ${Number(prixMax).toLocaleString("fr-FR")} DH` : null,
    chambres ? `${chambres} ch.` : null,
  ].filter((x): x is string => Boolean(x));
  const nbActifs = resume.length;

  function reinitialiser() {
    setVille("");
    setType("");
    setPrixMin("");
    setPrixMax("");
    setChambres("");
    router.push(pathname);
  }

  const champStyle = {
    borderColor: "var(--bordure-chaude)",
    color: "var(--primaire)",
    background: "var(--fond-secondaire)",
  } as const;

  return (
    <div
      className="bg-white border-b"
      style={{ borderColor: "#E8E2D2", boxShadow: "0 2px 8px rgba(15,76,58,0.06)" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5">

        {/* ── Barre compacte (toujours visible) ─────────────────────────────── */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOuvert((o) => !o)}
            aria-expanded={ouvert}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors hover:bg-gray-50 cursor-pointer flex-shrink-0"
            style={{ borderColor: "var(--primaire)", color: "var(--primaire)" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="10" y1="18" x2="14" y2="18" />
            </svg>
            Filtres
            {nbActifs > 0 && (
              <span
                className="inline-flex items-center justify-center text-xs font-bold rounded-full"
                style={{ background: "var(--accent)", color: "var(--texte-sur-accent)", minWidth: 18, height: 18, padding: "0 5px" }}
              >
                {nbActifs}
              </span>
            )}
            <svg
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
              style={{ transform: ouvert ? "rotate(180deg)" : "none", transition: "transform 0.18s" }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Résumé des filtres actifs (masqué si aucun) */}
          {nbActifs > 0 && !ouvert && (
            <div className="flex items-center gap-1.5 overflow-x-auto flex-nowrap min-w-0">
              {resume.map((r) => (
                <span
                  key={r}
                  className="text-xs px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0"
                  style={{ background: "var(--fond-secondaire)", color: "var(--primaire)", border: "1px solid var(--bordure-chaude)" }}
                >
                  {r}
                </span>
              ))}
            </div>
          )}

          {/* Compteur résultats */}
          <p className="ml-auto text-sm flex-shrink-0" style={{ color: "var(--texte-chaud)" }}>
            <span className="font-semibold" style={{ color: "var(--primaire)" }}>{total}</span>{" "}
            <span className="hidden sm:inline">bien{total !== 1 ? "s" : ""} trouvé{total !== 1 ? "s" : ""}</span>
            <span className="sm:hidden">bien{total !== 1 ? "s" : ""}</span>
          </p>
        </div>

        {/* ── Panneau détaillé (déroulant) ──────────────────────────────────── */}
        {ouvert && (
        <div className="flex flex-wrap items-end gap-3 pt-3 mt-3 border-t" style={{ borderColor: "#F0EBDD" }}>

          {/* Ville */}
          <div>
            <label className="block text-xs mb-1" style={{ color: "#888" }}>Ville</label>
            <select
              value={ville}
              onChange={(e) => setVille(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none appearance-none cursor-pointer"
              style={{ ...champStyle, minWidth: 140 }}
            >
              <option value="">Toutes les villes</option>
              {VILLES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs mb-1" style={{ color: "#888" }}>Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none appearance-none cursor-pointer"
              style={{ ...champStyle, minWidth: 140 }}
            >
              <option value="">Tous les types</option>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Budget min */}
          <div>
            <label className="block text-xs mb-1" style={{ color: "#888" }}>Budget min (DH)</label>
            <input
              type="number"
              placeholder="0"
              value={prixMin}
              onChange={(e) => setPrixMin(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ ...champStyle, width: 120 }}
            />
          </div>

          {/* Budget max */}
          <div>
            <label className="block text-xs mb-1" style={{ color: "#888" }}>Budget max (DH)</label>
            <input
              type="number"
              placeholder="∞"
              value={prixMax}
              onChange={(e) => setPrixMax(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ ...champStyle, width: 120 }}
            />
          </div>

          {/* Chambres */}
          <div>
            <label className="block text-xs mb-1" style={{ color: "#888" }}>Chambres</label>
            <select
              value={chambres}
              onChange={(e) => setChambres(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none appearance-none cursor-pointer"
              style={{ ...champStyle, minWidth: 110 }}
            >
              <option value="">Toutes</option>
              {CHAMBRES.map((c) => <option key={c} value={c}>{c} ch.</option>)}
            </select>
          </div>

          {/* Boutons action */}
          <div className="flex gap-2">
            <button
              onClick={reinitialiser}
              className="px-4 py-2 rounded-lg text-sm border transition-colors hover:bg-gray-50 cursor-pointer"
              style={{ borderColor: "var(--primaire)", color: "var(--primaire)" }}
            >
              Réinitialiser
            </button>
            <button
              onClick={filtrer}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 cursor-pointer"
              style={{ background: "var(--accent)", color: "var(--texte-sur-accent)" }}
            >
              Filtrer
            </button>
          </div>

        </div>
        )}
      </div>
    </div>
  );
}
