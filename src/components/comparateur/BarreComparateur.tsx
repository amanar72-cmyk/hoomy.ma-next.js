"use client";

import { useComparateur } from "@/lib/comparateur/ComparateurContext";
import { useRouter, usePathname } from "next/navigation";

export default function BarreComparateur() {
  const { biens, supprimer, vider } = useComparateur();
  const router = useRouter();
  const pathname = usePathname();

  if (pathname === "/comparer" || biens.length === 0) return null;

  function comparer() {
    router.push(`/comparer?biens=${biens.map((b) => b.id).join(",")}`);
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: "var(--primaire)",
        boxShadow: "0 -4px 24px rgba(15,76,58,0.30)",
        transform: "translateY(0)",
        transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6"
        style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 10, paddingBottom: 10 }}
      >
        {/* Miniatures */}
        <div style={{ display: "flex", gap: 8, flex: 1, overflow: "hidden" }}>
          {biens.map((b) => (
            <div key={b.id} style={{ position: "relative", flexShrink: 0 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "2px solid rgba(212,175,55,0.5)",
                }}
              >
                {b.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.photo} alt={b.titre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: "var(--primaire-clair)" }} />
                )}
              </div>
              <button
                type="button"
                onClick={() => supprimer(b.id)}
                aria-label={`Retirer ${b.titre}`}
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  color: "var(--primaire)",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          ))}
          {/* Emplacements vides jusqu'à 4 */}
          {Array.from({ length: Math.max(0, 2 - biens.length) }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                border: "2px dashed rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.04)",
                flexShrink: 0,
              }}
            />
          ))}
        </div>

        {/* Texte */}
        <p
          className="hidden sm:block"
          style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 500, flexShrink: 0 }}
        >
          {biens.length} bien{biens.length > 1 ? "s" : ""} sélectionné{biens.length > 1 ? "s" : ""}
          {biens.length < 2 && (
            <span style={{ opacity: 0.5, marginLeft: 4 }}>(2 min.)</span>
          )}
        </p>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={vider}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              border: "none",
              background: "rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.75)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Effacer
          </button>
          <button
            type="button"
            onClick={comparer}
            disabled={biens.length < 2}
            style={{
              padding: "7px 18px",
              borderRadius: 8,
              border: "none",
              background: "var(--accent)",
              color: "var(--primaire)",
              fontSize: 13,
              fontWeight: 700,
              cursor: biens.length >= 2 ? "pointer" : "not-allowed",
              opacity: biens.length >= 2 ? 1 : 0.45,
              transition: "opacity 0.2s",
            }}
          >
            Comparer{biens.length >= 2 ? ` (${biens.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
