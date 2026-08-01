"use client";

// Champs de caractéristiques spécifiques au type de bien (étage, terrain,
// titre juridique…). Rend automatiquement les bons champs via la config
// src/lib/biens/caracteristiques.ts. Valeurs stockées dans un objet plat
// (→ colonne jsonb biens.caracteristiques).

import { champsPourType, type Caracteristiques, type ValeurCarac } from "@/lib/biens/caracteristiques";

type Props = {
  type: string;
  valeur: Caracteristiques;
  onChange: (v: Caracteristiques) => void;
};

export default function ChampsCaracteristiques({ type, valeur, onChange }: Props) {
  const champs = champsPourType(type);

  function set(cle: string, v: ValeurCarac | "") {
    const suivant = { ...valeur };
    if (v === "" ) delete suivant[cle];
    else suivant[cle] = v;
    onChange(suivant);
  }

  const styleInput: React.CSSProperties = { borderColor: "#E0DAC8", color: "#0F4C3A", background: "#fff" };
  const clsInput = "border rounded-xl px-3 py-2 text-sm w-full focus:outline-none";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {champs.map((c) => {
        const v = valeur[c.cle];

        if (c.type === "bool") {
          return (
            <label key={c.cle} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "#3D4A42" }}>
              <input
                type="checkbox"
                checked={v === true}
                onChange={(e) => set(c.cle, e.target.checked)}
                style={{ width: 16, height: 16, accentColor: "#0F4C3A" }}
              />
              {c.label}
            </label>
          );
        }

        return (
          <div key={c.cle} className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "#555" }}>
              {c.label}{c.suffixe ? ` (${c.suffixe})` : ""}
            </label>
            {c.type === "select" ? (
              <select
                value={typeof v === "string" ? v : ""}
                onChange={(e) => set(c.cle, e.target.value)}
                className={clsInput}
                style={styleInput}
              >
                <option value="">—</option>
                {c.options?.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                type={c.type === "nombre" ? "number" : "text"}
                inputMode={c.type === "nombre" ? "decimal" : undefined}
                value={v === undefined || v === null ? "" : String(v)}
                onChange={(e) =>
                  set(
                    c.cle,
                    e.target.value === ""
                      ? ""
                      : c.type === "nombre"
                      ? Number(e.target.value)
                      : e.target.value
                  )
                }
                className={clsInput}
                style={styleInput}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
