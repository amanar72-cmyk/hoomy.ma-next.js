"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { FiltresActifs } from "@/lib/types";

const VILLES = ["Casablanca", "Marrakech", "Rabat", "Tanger", "Agadir", "Fès"];
const TYPES = ["Appartement", "Villa", "Riad", "Bureau", "Terrain"];
const CHAMBRES = ["1", "2", "3", "4", "5+"];

type Props = {
  defaultFiltres: FiltresActifs;
  total: number;
};

export default function FiltresBar({ defaultFiltres, total }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  // État local initialisé depuis les props serveur ; le composant est remonté
  // via key={} à chaque navigation, donc les valeurs restent synchronisées.
  const [ville, setVille] = useState(defaultFiltres.ville);
  const [type, setType] = useState(defaultFiltres.type);
  const [prixMin, setPrixMin] = useState(defaultFiltres.prixMin);
  const [prixMax, setPrixMax] = useState(defaultFiltres.prixMax);
  const [chambres, setChambres] = useState(defaultFiltres.chambres);

  function filtrer() {
    const params = new URLSearchParams();
    if (ville) params.set("ville", ville);
    if (type) params.set("type", type);
    if (prixMin) params.set("prixMin", prixMin);
    if (prixMax) params.set("prixMax", prixMax);
    if (chambres) params.set("chambres", chambres);
    if (defaultFiltres.tri) params.set("tri", defaultFiltres.tri);
    router.push(`${pathname}?${params.toString()}`);
  }

  function reinitialiser() {
    setVille("");
    setType("");
    setPrixMin("");
    setPrixMax("");
    setChambres("");
    router.push(pathname);
  }

  const champStyle = {
    borderColor: "#E0DAC8",
    color: "#0F4C3A",
    background: "#fff",
  } as const;

  return (
    <div
      className="sticky top-16 z-40 bg-white border-b"
      style={{ borderColor: "#E8E2D2", boxShadow: "0 2px 8px rgba(15,76,58,0.06)" }}
    >
      <div className="max-w-6xl mx-auto px-6 py-3">
        <div className="flex flex-wrap items-end gap-3">

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
              style={{ borderColor: "#0F4C3A", color: "#0F4C3A" }}
            >
              Réinitialiser
            </button>
            <button
              onClick={filtrer}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 cursor-pointer"
              style={{ background: "#D4AF37", color: "#0F4C3A" }}
            >
              Filtrer
            </button>
          </div>

          {/* Compteur résultats */}
          <p className="ml-auto text-sm hidden md:block" style={{ color: "#6B6450" }}>
            <span className="font-semibold" style={{ color: "#0F4C3A" }}>{total}</span>{" "}
            bien{total !== 1 ? "s" : ""} trouvé{total !== 1 ? "s" : ""}
          </p>

        </div>
      </div>
    </div>
  );
}
