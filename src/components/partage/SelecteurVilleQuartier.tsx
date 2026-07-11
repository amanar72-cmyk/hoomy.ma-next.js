"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const VILLES = ["Casablanca", "Marrakech", "Rabat", "Tanger", "Agadir", "Fès"];

// Retire les accents pour une recherche tolérante (Guéliz ↔ gueliz)
function plat(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

type Props = {
  ville: string;
  quartier: string;
  onVilleChange: (v: string) => void;
  onQuartierChange: (q: string) => void;
  labelCls?: string;
  labelStyle?: React.CSSProperties;
  selectCls?: string;
  selectStyle?: React.CSSProperties;
  villeRequise?: boolean;
};

export default function SelecteurVilleQuartier({
  ville,
  quartier,
  onVilleChange,
  onQuartierChange,
  labelCls = "block text-xs font-semibold mb-1.5",
  labelStyle = { color: "#0F4C3A" },
  selectCls = "w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none",
  selectStyle = { borderColor: "#E0DAC8", color: "#1f2a24", background: "#fff" },
  villeRequise = false,
}: Props) {
  const [quartiers, setQuartiers] = useState<string[]>([]);
  const [chargement, setChargement] = useState(false);
  // Combobox quartier : liste de suggestions ouverte/fermée
  const [listeOuverte, setListeOuverte] = useState(false);
  const conteneurQuartierRef = useRef<HTMLDivElement>(null);

  // Ref pour éviter de réinitialiser le quartier au premier rendu (formulaires d'édition)
  const estPremierRendu = useRef(true);
  const onQuartierChangeRef = useRef(onQuartierChange);
  useEffect(() => {
    onQuartierChangeRef.current = onQuartierChange;
  }, [onQuartierChange]);

  useEffect(() => {
    const premier = estPremierRendu.current;
    estPremierRendu.current = false;

    if (!ville) {
      setQuartiers([]);
      if (!premier) onQuartierChangeRef.current("");
      return;
    }

    let annule = false;
    setChargement(true);
    if (!premier) onQuartierChangeRef.current("");

    async function charger() {
      const supabase = createClient();
      const { data } = await supabase
        .from("quartiers")
        .select("nom")
        .eq("ville", ville)
        .order("nom");
      if (annule) return;
      setQuartiers((data ?? []).map((r: { nom: string }) => r.nom));
      setChargement(false);
    }
    void charger();
    return () => {
      annule = true;
    };
  }, [ville]);

  // Fermer la liste au clic en dehors
  useEffect(() => {
    if (!listeOuverte) return;
    function fermer(e: MouseEvent) {
      if (!conteneurQuartierRef.current?.contains(e.target as Node)) setListeOuverte(false);
    }
    document.addEventListener("mousedown", fermer);
    return () => document.removeEventListener("mousedown", fermer);
  }, [listeOuverte]);

  // Suggestions filtrées par la saisie (insensible aux accents) ; la valeur
  // tapée reste TOUJOURS acceptée telle quelle (saisie libre).
  const suggestions = useMemo(() => {
    const q = plat(quartier.trim());
    if (!q) return quartiers;
    return quartiers.filter((n) => plat(n).includes(q));
  }, [quartier, quartiers]);

  const correspondanceExacte = quartiers.some((n) => n === quartier);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className={labelCls} style={labelStyle}>
          Ville{villeRequise ? " *" : ""}
        </label>
        <select
          value={ville}
          onChange={(e) => onVilleChange(e.target.value)}
          required={villeRequise}
          className={selectCls}
          style={selectStyle}
        >
          <option value="">Sélectionner…</option>
          {VILLES.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>

      {/* ── Quartier : combobox — on tape librement ET on cherche dedans ──── */}
      <div ref={conteneurQuartierRef} className="relative">
        <label className={labelCls} style={labelStyle}>
          Quartier
        </label>
        <input
          type="text"
          value={quartier}
          onChange={(e) => {
            onQuartierChange(e.target.value);
            setListeOuverte(true);
          }}
          onFocus={() => { if (ville) setListeOuverte(true); }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setListeOuverte(false);
            if (e.key === "Enter") {
              // Entrée : on prend la 1re suggestion si la saisie n'est pas déjà exacte
              if (listeOuverte && suggestions.length > 0 && !correspondanceExacte) {
                e.preventDefault();
                onQuartierChange(suggestions[0]);
              }
              setListeOuverte(false);
            }
          }}
          disabled={!ville || chargement}
          placeholder={!ville ? "Choisissez d'abord une ville" : chargement ? "Chargement…" : "Tapez ou choisissez…"}
          autoComplete="off"
          role="combobox"
          aria-expanded={listeOuverte}
          aria-controls="liste-quartiers"
          aria-autocomplete="list"
          className={`${selectCls} disabled:opacity-50`}
          style={selectStyle}
        />

        {listeOuverte && ville && !chargement && suggestions.length > 0 && (
          <ul
            id="liste-quartiers"
            className="absolute left-0 right-0 z-30 mt-1 rounded-xl overflow-y-auto"
            style={{
              maxHeight: 210,
              background: "#fff",
              border: "1px solid #E0DAC8",
              boxShadow: "0 10px 32px rgba(15,76,58,0.14)",
              listStyle: "none",
              margin: "4px 0 0",
              padding: 0,
            }}
          >
            {suggestions.map((n) => (
              <li key={n}>
                <button
                  type="button"
                  onClick={() => {
                    onQuartierChange(n);
                    setListeOuverte(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm cursor-pointer"
                  style={{
                    background: n === quartier ? "rgba(15,76,58,0.07)" : "transparent",
                    color: "#1f2a24",
                    border: "none",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(15,76,58,0.06)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = n === quartier ? "rgba(15,76,58,0.07)" : "transparent"; }}
                >
                  {n}
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Saisie libre assumée : petit indice quand le quartier tapé est nouveau */}
        {ville && quartier.trim() && !correspondanceExacte && !chargement && (
          <p className="text-xs mt-1" style={{ color: "#9DB8AD" }}>
            Quartier libre : « {quartier.trim()} »
          </p>
        )}
      </div>
    </div>
  );
}
