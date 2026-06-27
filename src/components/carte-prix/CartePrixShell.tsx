"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { QuartierPrix, MoyenneVille } from "@/app/carte-des-prix/page";
import PanneauGauche from "./PanneauGauche";
import LegendeHeatmap from "./LegendeHeatmap";
import { couleurHeatmap } from "./heatmapUtils";

// Import dynamique avec ssr:false — évite "window is not defined" au build
const CarteLeaflet = dynamic(() => import("./CarteLeaflet"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a2418",
        color: "#6B9F7E",
        fontSize: "0.85rem",
        letterSpacing: "0.08em",
      }}
    >
      Chargement de la carte…
    </div>
  ),
});

type Props = {
  quartiers: QuartierPrix[];
  moyennesVilles: MoyenneVille[];
};

export default function CartePrixShell({ quartiers, moyennesVilles }: Props) {
  const [villeActive, setVilleActive] = useState<string | null>(null);

  const prixMin = moyennesVilles.length > 0 ? Math.min(...moyennesVilles.map((v) => v.prixMoyen)) : 0;
  const prixMax = moyennesVilles.length > 0 ? Math.max(...moyennesVilles.map((v) => v.prixMoyen)) : 0;
  const prixMedian =
    moyennesVilles.length > 0
      ? [...moyennesVilles].sort((a, b) => a.prixMoyen - b.prixMoyen)[
          Math.floor(moyennesVilles.length / 2)
        ].prixMoyen
      : 0;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "0 0 0 0",
        // Hauteur calculée : 100vh moins la navbar (~64px) et le header de titre (~64px)
        height: "calc(100vh - 128px)",
        minHeight: 500,
      }}
    >
      {/* Layout 2 colonnes (desktop) / colonne unique (mobile) */}
      <div
        style={{
          display: "flex",
          flex: 1,
          gap: 0,
          overflow: "hidden",
          // Sur mobile : colonne unique (carte en haut, panneau en bas)
        }}
        className="carte-prix-layout"
      >
        {/* ── Panneau gauche 36% ─────────────────────────────────────────── */}
        <aside
          style={{
            width: "36%",
            minWidth: 280,
            flexShrink: 0,
            overflowY: "auto",
            padding: "20px 20px 20px 16px",
            background: "rgba(0,0,0,0.2)",
            borderRight: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
          className="carte-prix-panneau"
        >
          <PanneauGauche
            villeActive={villeActive}
            moyennesVilles={moyennesVilles}
            quartiers={quartiers}
            onSelectVille={setVilleActive}
            onRetour={() => setVilleActive(null)}
          />

          {/* Légende heatmap (visible en vue nationale uniquement) */}
          {!villeActive && prixMin > 0 && (
            <div style={{ marginTop: "auto", paddingTop: 12 }}>
              <LegendeHeatmap min={prixMin} max={prixMax} median={prixMedian} />
            </div>
          )}
        </aside>

        {/* ── Zone carte droite 64% ──────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            position: "relative",
            overflow: "hidden",
          }}
          className="carte-prix-carte"
        >
          <CarteLeaflet
            moyennesVilles={moyennesVilles}
            villeActive={villeActive}
            onSelectVille={setVilleActive}
          />

          {/* Badge ville active */}
          {villeActive && (
            <div
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                background: "rgba(10,36,24,0.88)",
                border: "1px solid rgba(212,175,55,0.4)",
                borderRadius: 8,
                padding: "6px 14px",
                color: "#D4AF37",
                fontFamily: "var(--font-marcellus)",
                fontSize: "0.9rem",
                pointerEvents: "none",
                zIndex: 1000,
                backdropFilter: "blur(4px)",
              }}
            >
              {villeActive}
              {moyennesVilles.find((v) => v.ville === villeActive) && (
                <span style={{ color: "#9BC4A8", fontSize: "0.75rem", marginLeft: 8 }}>
                  {moyennesVilles.find((v) => v.ville === villeActive)!.prixMoyen.toLocaleString("fr-FR")} DH/m²
                </span>
              )}
            </div>
          )}

          {/* Légende flottante sur la carte (vue nationale) */}
          {!villeActive && prixMin > 0 && (
            <div
              style={{
                position: "absolute",
                bottom: 28,
                right: 12,
                zIndex: 1000,
                width: 220,
              }}
            >
              <LegendeHeatmap min={prixMin} max={prixMax} median={prixMedian} />
            </div>
          )}

          {/* Pastilles couleurs villes sur la carte (vue nationale) — indicateur visuel */}
          {!villeActive && (
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                zIndex: 1000,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                background: "rgba(10,36,24,0.85)",
                borderRadius: 10,
                padding: "8px 12px",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(4px)",
              }}
            >
              {[...moyennesVilles]
                .sort((a, b) => b.prixMoyen - a.prixMoyen)
                .map((v) => (
                  <button
                    key={v.ville}
                    onClick={() => setVilleActive(v.ville)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px 0",
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: couleurHeatmap(v.prixMoyen, prixMin, prixMax),
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ color: "#FAF7F0", fontSize: "0.72rem" }}>{v.ville}</span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Styles responsive + prefers-reduced-motion */}
      <style>{`
        @media (max-width: 768px) {
          .carte-prix-layout {
            flex-direction: column-reverse !important;
            height: auto !important;
            overflow: visible !important;
          }
          .carte-prix-panneau {
            width: 100% !important;
            min-width: unset !important;
            border-right: none !important;
            border-top: 1px solid rgba(255,255,255,0.06) !important;
            max-height: 60vh;
          }
          .carte-prix-carte {
            height: 50vh !important;
            min-height: 300px !important;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          * { transition: none !important; animation: none !important; }
        }
      `}</style>
    </div>
  );
}
