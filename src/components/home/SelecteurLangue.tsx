"use client";

// Sélecteur de langue VISUEL — mémorise le choix (cookie hoomy_langue).
// NE traduit PAS encore le contenu : la vraie i18n sera branchée séparément.

import { useState, useEffect, useRef } from "react";

const LANGUES = [
  { code: "fr", label: "FR", nom: "Français" },
  { code: "ar", label: "AR", nom: "العربية" },
  { code: "en", label: "EN", nom: "English" },
] as const;

type CodeLangue = "fr" | "ar" | "en";

const CODES_VALIDES = LANGUES.map((l) => l.code);

function lireCookieLangue(): CodeLangue {
  if (typeof document === "undefined") return "fr";
  const m = document.cookie.match(/(?:^|; )hoomy_langue=([^;]*)/);
  return m && CODES_VALIDES.includes(m[1] as CodeLangue) ? (m[1] as CodeLangue) : "fr";
}

function ecrireCookieLangue(code: CodeLangue) {
  document.cookie = `hoomy_langue=${code};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
}

export default function SelecteurLangue() {
  const [langue, setLangue]   = useState<CodeLangue>("fr");
  const [ouvert, setOuvert]   = useState(false);
  const refConteneur          = useRef<HTMLDivElement>(null);

  // Lire le cookie au montage (côté client uniquement)
  useEffect(() => { setLangue(lireCookieLangue()); }, []);

  // Fermer sur clic extérieur
  useEffect(() => {
    if (!ouvert) return;
    const fermer = (e: MouseEvent) => {
      if (refConteneur.current && !refConteneur.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    };
    document.addEventListener("mousedown", fermer);
    return () => document.removeEventListener("mousedown", fermer);
  }, [ouvert]);

  // Fermer sur Échap
  useEffect(() => {
    if (!ouvert) return;
    const fermer = (e: KeyboardEvent) => { if (e.key === "Escape") setOuvert(false); };
    document.addEventListener("keydown", fermer);
    return () => document.removeEventListener("keydown", fermer);
  }, [ouvert]);

  function choisir(code: CodeLangue) {
    setLangue(code);
    ecrireCookieLangue(code);
    setOuvert(false);
  }

  const actuelle = LANGUES.find((l) => l.code === langue)!;

  return (
    <div ref={refConteneur} className="relative" style={{ userSelect: "none" }}>
      {/* ── Bouton déclencheur ──────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-label={`Langue sélectionnée : ${actuelle.nom}. Ouvrir le sélecteur de langue.`}
        aria-expanded={ouvert}
        aria-haspopup="listbox"
        className="flex items-center gap-1 transition-opacity hover:opacity-80"
        style={{
          padding: "5px 9px",
          borderRadius: 8,
          border: "1.5px solid var(--bordure)",
          color: "var(--texte-secondaire)",
          background: "transparent",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          fontFamily: "var(--font-outfit), sans-serif",
          lineHeight: 1,
        }}
      >
        {/* Icône globe */}
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>

        {actuelle.label}

        {/* Chevron */}
        <svg
          width="9" height="9" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.8"
          style={{
            transform: ouvert ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* ── Dropdown ────────────────────────────────────────────────────── */}
      {ouvert && (
        <div
          role="listbox"
          aria-label="Choisir la langue"
          className="absolute right-0 top-full mt-1.5 rounded-xl overflow-hidden"
          style={{
            background: "var(--fond-secondaire)",
            border: "1px solid var(--bordure)",
            boxShadow: "0 8px 24px rgba(15,76,58,0.13)",
            minWidth: 148,
            zIndex: 100,
          }}
        >
          {LANGUES.map((l) => {
            const actif = l.code === langue;
            return (
              <button
                key={l.code}
                type="button"
                role="option"
                aria-selected={actif}
                onClick={() => choisir(l.code)}
                className="w-full flex items-center justify-between transition-colors"
                style={{
                  padding: "10px 14px",
                  background: actif ? "var(--fond-vert-leger, #ecf5f0)" : "transparent",
                  color: actif ? "var(--primaire)" : "var(--texte-corps)",
                  cursor: "pointer",
                  border: "none",
                  fontFamily: "var(--font-outfit), sans-serif",
                  fontSize: 13,
                  fontWeight: actif ? 600 : 400,
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (!actif) (e.currentTarget as HTMLButtonElement).style.background = "var(--fond-accent, #f5f0e8)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = actif ? "var(--fond-vert-leger, #ecf5f0)" : "";
                }}
              >
                <span>{l.nom}</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    color: actif ? "var(--primaire)" : "var(--texte-tertiaire)",
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  {l.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
