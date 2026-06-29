"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoHoomy from "./LogoHoomy";

const LIENS_NAV = [
  { label: "Acheter",               href: "/acheter" },
  { label: "Louer",                 href: "/louer" },
  { label: "Neuf",                  href: "/neuf" },
  { label: "Estimer mon bien",      href: "/estimer" },
  { label: "Carte des prix",        href: "/carte" },
  { label: "Simulateur de crédit",  href: "/simulateur-credit" },
] as const;

interface Props {
  estConnecte: boolean;
  nomComplet: string | null;
}

export default function MenuMobileHamburger({ estConnecte, nomComplet }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const pathname = usePathname();

  // Fermer automatiquement sur changement de route (clic sur un lien)
  useEffect(() => { setOuvert(false); }, [pathname]);

  // Touche Échap + blocage du défilement pendant l'ouverture
  useEffect(() => {
    if (!ouvert) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOuvert(false); };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [ouvert]);

  const lienStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    padding: "14px 20px",
    fontSize: 15,
    fontFamily: "var(--font-outfit), sans-serif",
    color: "var(--texte-corps)",
    textDecoration: "none",
    borderBottom: "1px solid var(--bordure-legere, #f0ede5)",
    transition: "background 0.15s",
  };

  return (
    <>
      {/* ── Bouton hamburger (mobile uniquement) ──────────────────────────── */}
      <button
        type="button"
        onClick={() => setOuvert(true)}
        aria-label="Ouvrir le menu de navigation"
        aria-expanded={ouvert}
        aria-controls="menu-mobile-drawer"
        className="md:hidden flex items-center justify-center rounded-xl cursor-pointer"
        style={{
          width: 40,
          height: 40,
          color: "var(--primaire)",
          background: "transparent",
          border: "none",
          padding: 0,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="3" y1="6"  x2="21" y2="6"  />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* ── Overlay (toujours dans le DOM, opacité contrôlée) ─────────────── */}
      <div
        aria-hidden="true"
        onClick={() => setOuvert(false)}
        className="fixed inset-0 md:hidden"
        style={{
          zIndex: 60,
          background: "rgba(10,36,24,0.58)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          opacity: ouvert ? 1 : 0,
          pointerEvents: ouvert ? "auto" : "none",
          transition: "opacity 0.28s ease",
        }}
      />

      {/* ── Drawer (toujours dans le DOM, translateX contrôlé) ────────────── */}
      <div
        id="menu-mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navigation"
        aria-hidden={!ouvert}
        className="fixed top-0 right-0 bottom-0 md:hidden flex flex-col"
        style={{
          zIndex: 70,
          width: "min(300px, 88vw)",
          background: "var(--fond-secondaire)",
          boxShadow: "-6px 0 40px rgba(15,76,58,0.18)",
          transform: ouvert ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          willChange: "transform",
        }}
      >
        {/* ── En-tête du drawer ──────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--bordure)" }}
        >
          <Link href="/" style={{ textDecoration: "none" }}>
            <LogoHoomy tailleBadge={26} tailleTexte={17} />
          </Link>

          <button
            type="button"
            onClick={() => setOuvert(false)}
            aria-label="Fermer le menu"
            style={{
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--fond-accent, #f0f7f4)",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              color: "var(--texte-tertiaire)",
              flexShrink: 0,
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="18" y1="6"  x2="6"  y2="18" />
              <line x1="6"  y1="6"  x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Liens de navigation ────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto" aria-label="Navigation principale">
          {LIENS_NAV.map((lien) => (
            <Link
              key={lien.href}
              href={lien.href}
              style={lienStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fond-accent, #f0f7f4)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
            >
              {lien.label}
            </Link>
          ))}

          {/* Séparateur */}
          <div style={{ height: 1, background: "var(--bordure, #E8E2D2)", margin: "8px 0" }} />

          {/* Publier un bien */}
          <Link
            href="/publier"
            style={{ ...lienStyle, color: "var(--primaire)", fontWeight: 600 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fond-accent, #f0f7f4)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "")}
          >
            <span style={{ marginRight: 8 }}>+</span> Publier un bien
          </Link>
        </nav>

        {/* ── Section auth ───────────────────────────────────────────────── */}
        <div
          className="shrink-0 px-4 py-5 flex flex-col gap-3"
          style={{ borderTop: "1px solid var(--bordure)" }}
        >
          {estConnecte ? (
            <>
              {nomComplet && (
                <p
                  className="text-xs font-medium truncate"
                  style={{ color: "var(--texte-tertiaire)", marginBottom: 2 }}
                >
                  Bonjour, {nomComplet.split(" ")[0]}
                </p>
              )}
              <Link
                href="/mon-compte"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "12px 0",
                  borderRadius: 14,
                  fontSize: 14,
                  fontWeight: 600,
                  background: "var(--primaire)",
                  color: "var(--fond-secondaire)",
                  textDecoration: "none",
                }}
              >
                Mon compte
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/connexion"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "12px 0",
                  borderRadius: 14,
                  fontSize: 14,
                  fontWeight: 600,
                  border: "1.5px solid var(--primaire)",
                  color: "var(--primaire)",
                  textDecoration: "none",
                }}
              >
                Se connecter
              </Link>
              <Link
                href="/inscription"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "12px 0",
                  borderRadius: 14,
                  fontSize: 14,
                  fontWeight: 600,
                  background: "var(--accent)",
                  color: "var(--primaire)",
                  textDecoration: "none",
                }}
              >
                Créer un compte
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
