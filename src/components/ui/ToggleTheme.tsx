"use client";

import { useTheme } from "@/lib/theme/useTheme";

// ── Persistance via cookie (1 an, SameSite=Lax) ───────────────────────────────
function ecrireCookieTheme(theme: "light" | "dark") {
  const exp = new Date();
  exp.setFullYear(exp.getFullYear() + 1);
  document.cookie = `hoomy_theme=${theme};path=/;expires=${exp.toUTCString()};SameSite=Lax`;
}

// ── Icônes SVG ────────────────────────────────────────────────────────────────

function IcSoleil() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.05" y2="7.05" />
      <line x1="16.95" y1="16.95" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.05" y2="16.95" />
      <line x1="16.95" y1="7.05" x2="19.07" y2="4.93" />
    </svg>
  );
}

function IcLune() {
  return (
    <svg
      width="15" height="15" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

// ── Composant ─────────────────────────────────────────────────────────────────

export default function ToggleTheme() {
  const theme = useTheme();
  const estNuit = theme === "dark";

  function basculer() {
    const nouveau = estNuit ? "light" : "dark";
    const html = document.documentElement;
    // Transition douce : classe temporaire 400 ms
    html.classList.add("en-transition");
    html.setAttribute("data-theme", nouveau);
    ecrireCookieTheme(nouveau);
    window.setTimeout(() => html.classList.remove("en-transition"), 400);
  }

  return (
    <button
      type="button"
      onClick={basculer}
      aria-label={estNuit ? "Activer le mode jour" : "Activer le mode nuit"}
      title={estNuit ? "Mode jour" : "Mode nuit"}
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        border: "1.5px solid var(--bordure)",
        background: estNuit ? "rgba(212,175,55,0.12)" : "transparent",
        color: estNuit ? "var(--accent)" : "var(--texte-secondaire)",
        flexShrink: 0,
        outline: "none",
        transition: "background 0.2s, color 0.2s, border-color 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = estNuit
          ? "rgba(212,175,55,0.22)"
          : "var(--fond-accent)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = estNuit
          ? "rgba(212,175,55,0.12)"
          : "transparent";
      }}
    >
      {estNuit ? <IcSoleil /> : <IcLune />}
    </button>
  );
}
