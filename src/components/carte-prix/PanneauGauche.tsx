"use client";

import { useState } from "react";
import type { QuartierPrix, MoyenneVille } from "@/app/carte-des-prix/page";
import { couleurHeatmap } from "./heatmapUtils";

type ColonnesTri = "nom" | "prix_m2_appartement" | "prix_m2_villa" | "prix_m2_moyen";

type Props = {
  villeActive: string | null;
  moyennesVilles: MoyenneVille[];
  quartiers: QuartierPrix[];
  onSelectVille: (ville: string) => void;
  onRetour: () => void;
};

function fmt(n: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("fr-FR") + " DH";
}

export default function PanneauGauche({
  villeActive,
  moyennesVilles,
  quartiers,
  onSelectVille,
  onRetour,
}: Props) {
  const [colTri, setColTri] = useState<ColonnesTri>("prix_m2_moyen");
  const [sensAsc, setSensAsc] = useState(false);

  const prixMin = Math.min(...moyennesVilles.map((v) => v.prixMoyen));
  const prixMax = Math.max(...moyennesVilles.map((v) => v.prixMoyen));
  const prixNational =
    moyennesVilles.length > 0
      ? Math.round(
          moyennesVilles.reduce((a, v) => a + v.prixMoyen, 0) / moyennesVilles.length
        )
      : 0;

  // ── Vue drill-down ──────────────────────────────────────────────────────────
  if (villeActive) {
    const quartiersVille = quartiers
      .filter((q) => q.ville === villeActive)
      .slice()
      .sort((a, b) => {
        const va = a[colTri] ?? -1;
        const vb = b[colTri] ?? -1;
        if (colTri === "nom") {
          return sensAsc
            ? String(va).localeCompare(String(vb), "fr")
            : String(vb).localeCompare(String(va), "fr");
        }
        return sensAsc ? (va as number) - (vb as number) : (vb as number) - (va as number);
      });

    const handleTri = (col: ColonnesTri) => {
      if (col === colTri) setSensAsc((s) => !s);
      else { setColTri(col); setSensAsc(false); }
    };

    const fleche = (col: ColonnesTri) =>
      colTri === col ? (sensAsc ? " ↑" : " ↓") : "";

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 16 }}>
        {/* Bouton retour */}
        <button
          onClick={onRetour}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(212,175,55,0.12)",
            border: "1px solid rgba(212,175,55,0.3)",
            borderRadius: 8,
            color: "#D4AF37",
            cursor: "pointer",
            fontSize: "0.8rem",
            padding: "6px 12px",
            transition: "background 0.2s",
            alignSelf: "flex-start",
          }}
        >
          ← Retour carte du Maroc
        </button>

        <div>
          <h2
            style={{
              fontFamily: "var(--font-marcellus)",
              color: "#FAF7F0",
              fontSize: "1.1rem",
              marginBottom: 2,
            }}
          >
            {villeActive}
          </h2>
          <p style={{ color: "#9BC4A8", fontSize: "0.75rem" }}>
            {quartiersVille.length} quartier{quartiersVille.length !== 1 ? "s" : ""} avec données
          </p>
        </div>

        {/* Tableau */}
        <div style={{ flex: 1, overflowY: "auto", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
            <thead>
              <tr style={{ background: "rgba(15,76,58,0.6)", position: "sticky", top: 0 }}>
                {(
                  [
                    ["nom", "Quartier"],
                    ["prix_m2_appartement", "Appt m²"],
                    ["prix_m2_villa", "Villa m²"],
                    ["prix_m2_moyen", "Moyen"],
                  ] as [ColonnesTri, string][]
                ).map(([col, label]) => (
                  <th
                    key={col}
                    onClick={() => handleTri(col)}
                    style={{
                      padding: "8px 10px",
                      textAlign: col === "nom" ? "left" : "right",
                      color: colTri === col ? "#D4AF37" : "#9BC4A8",
                      cursor: "pointer",
                      fontWeight: 600,
                      letterSpacing: "0.04em",
                      userSelect: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}{fleche(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quartiersVille.map((q, i) => (
                <tr
                  key={q.nom + i}
                  style={{
                    background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    transition: "background 0.15s",
                  }}
                >
                  <td style={{ padding: "7px 10px", color: "#FAF7F0" }}>{q.nom}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right", color: "#9BC4A8" }}>
                    {fmt(q.prix_m2_appartement)}
                  </td>
                  <td style={{ padding: "7px 10px", textAlign: "right", color: "#9BC4A8" }}>
                    {fmt(q.prix_m2_villa)}
                  </td>
                  <td
                    style={{
                      padding: "7px 10px",
                      textAlign: "right",
                      color: "#D4AF37",
                      fontWeight: 600,
                    }}
                  >
                    {fmt(q.prix_m2_moyen)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Vue nationale ───────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Prix moyen national */}
      <div
        style={{
          background: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(212,175,55,0.2)",
          borderRadius: 14,
          padding: "18px 20px",
        }}
      >
        <p
          style={{
            color: "#9BC4A8",
            fontSize: "0.72rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Prix moyen national
        </p>
        <p
          style={{
            fontFamily: "var(--font-marcellus)",
            color: "#D4AF37",
            fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
            lineHeight: 1,
            marginBottom: 4,
          }}
        >
          {prixNational.toLocaleString("fr-FR")} DH
          <span style={{ fontSize: "0.9rem", color: "#9BC4A8" }}>/m²</span>
        </p>
        <p style={{ color: "#6B9F7E", fontSize: "0.72rem" }}>Vente · moyenne sur {moyennesVilles.length} villes</p>
      </div>

      {/* Top villes */}
      <div>
        <p
          style={{
            color: "#9BC4A8",
            fontSize: "0.72rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          Top villes · prix au m²
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[...moyennesVilles]
            .sort((a, b) => b.prixMoyen - a.prixMoyen)
            .map((v) => (
              <button
                key={v.ville}
                onClick={() => onSelectVille(v.ville)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  cursor: "pointer",
                  transition: "background 0.2s, border-color 0.2s",
                  textAlign: "left",
                  width: "100%",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(212,175,55,0.08)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(212,175,55,0.3)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.07)";
                }}
              >
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: couleurHeatmap(v.prixMoyen, prixMin, prixMax),
                    flexShrink: 0,
                    boxShadow: `0 0 6px ${couleurHeatmap(v.prixMoyen, prixMin, prixMax)}88`,
                  }}
                />
                <span style={{ flex: 1, color: "#FAF7F0", fontSize: "0.85rem" }}>{v.ville}</span>
                <span style={{ color: "#D4AF37", fontWeight: 600, fontSize: "0.85rem" }}>
                  {v.prixMoyen.toLocaleString("fr-FR")} DH/m²
                </span>
              </button>
            ))}
        </div>
      </div>

      {/* CTA drill-down */}
      <div
        style={{
          background: "rgba(15,76,58,0.25)",
          border: "1px solid rgba(15,76,58,0.5)",
          borderRadius: 10,
          padding: "12px 16px",
          textAlign: "center",
        }}
      >
        <p style={{ color: "#6B9F7E", fontSize: "0.78rem", lineHeight: 1.5 }}>
          Clique sur une ville pour explorer les quartiers et leurs prix au m²
        </p>
      </div>
    </div>
  );
}
