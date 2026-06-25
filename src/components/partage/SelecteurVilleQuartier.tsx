"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const VILLES = ["Casablanca", "Marrakech", "Rabat", "Tanger", "Agadir", "Fès"];

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

  // Ref pour éviter de réinitialiser le quartier au premier rendu (formulaires d'édition)
  const estPremierRendu = useRef(true);
  const onQuartierChangeRef = useRef(onQuartierChange);
  onQuartierChangeRef.current = onQuartierChange;

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
  }, [ville]); // eslint-disable-line react-hooks/exhaustive-deps

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

      <div>
        <label className={labelCls} style={labelStyle}>
          Quartier
        </label>
        <select
          value={quartier}
          onChange={(e) => onQuartierChange(e.target.value)}
          disabled={!ville || chargement}
          className={`${selectCls} disabled:opacity-50`}
          style={selectStyle}
        >
          <option value="">
            {!ville
              ? "Choisissez d'abord une ville"
              : chargement
              ? "Chargement…"
              : "Non précisé"}
          </option>
          {quartiers.map((q) => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
