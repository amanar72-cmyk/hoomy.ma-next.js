"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Props = {
  nomComplet: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: string | null;
};

function hrefTableauDeBord(role: string | null): string {
  if (role === "admin") return "/admin";
  if (role === "agent" || role === "agence") return "/pro/biens";
  return "/mon-compte";
}

function labelTableauDeBord(role: string | null): string {
  if (role === "admin") return "Administration";
  if (role === "agent" || role === "agence") return "Espace Pro";
  return "Mon tableau de bord";
}

// Génère les initiales à partir du nom complet
function initiales(nom: string | null, email: string | null): string {
  if (nom) {
    const parties = nom.trim().split(" ").filter(Boolean);
    if (parties.length >= 2) return (parties[0][0] + parties[parties.length - 1][0]).toUpperCase();
    return parties[0]?.[0]?.toUpperCase() ?? "?";
  }
  return email?.[0]?.toUpperCase() ?? "?";
}

const itemMenuStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 16px",
  fontSize: 14,
  color: "var(--texte-corps)",
  textDecoration: "none",
  borderRadius: 8,
  transition: "background 0.12s",
  cursor: "pointer",
  background: "transparent",
  border: "none",
  width: "100%",
  textAlign: "left" as const,
};

export default function MenuUtilisateur({ nomComplet, email, avatarUrl, role }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const router = useRouter();
  const refMenu = useRef<HTMLDivElement>(null);

  // Ferme le menu si on clique en dehors
  useEffect(() => {
    function gererClic(e: MouseEvent) {
      if (refMenu.current && !refMenu.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    }
    document.addEventListener("mousedown", gererClic);
    return () => document.removeEventListener("mousedown", gererClic);
  }, []);

  async function seDeconnecter() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const ini = initiales(nomComplet, email);

  return (
    <div ref={refMenu} style={{ position: "relative" }}>
      {/* Bouton avatar */}
      <button
        onClick={() => setOuvert((o) => !o)}
        className="flex items-center gap-2 cursor-pointer rounded-xl px-2 py-1 transition-colors hover:bg-gray-50"
        style={{ border: "1px solid #E8E2D2", background: "var(--fond-secondaire)" }}
        aria-label="Menu utilisateur"
        aria-expanded={ouvert}
      >
        {/* Avatar ou initiales */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={nomComplet ?? "Profil"}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
            style={{ background: "var(--primaire)", color: "var(--accent)" }}
          >
            {ini}
          </div>
        )}
        {/* Nom tronqué sur desktop */}
        <span className="hidden sm:block text-sm max-w-24 truncate" style={{ color: "var(--primaire)" }}>
          {nomComplet?.split(" ")[0] ?? email?.split("@")[0]}
        </span>
        {/* Chevron */}
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--texte-tertiaire)"
          strokeWidth="2" strokeLinecap="round"
          style={{ transform: ouvert ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Menu déroulant */}
      {ouvert && (
        <div
          className="absolute right-0 mt-2 rounded-2xl overflow-hidden"
          style={{
            background: "var(--fond-secondaire)",
            boxShadow: "0 8px 32px rgba(15,76,58,0.14)",
            border: "1px solid #E8E2D2",
            minWidth: 220,
            zIndex: 100,
          }}
        >
          {/* En-tête du menu */}
          <div className="px-4 py-3" style={{ borderBottom: "1px solid #F0EAD8" }}>
            <p className="text-sm font-medium truncate" style={{ color: "var(--primaire)" }}>
              {nomComplet ?? "Utilisateur"}
            </p>
            <p className="text-xs truncate mt-0.5" style={{ color: "var(--texte-tertiaire)" }}>
              {email}
            </p>
          </div>

          {/* Items du menu */}
          <div className="p-2">
            <Link
              href={hrefTableauDeBord(role)}
              onClick={() => setOuvert(false)}
              style={itemMenuStyle}
              className="hover:bg-gray-50 flex"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" style={{ flexShrink: 0 }}>
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              {labelTableauDeBord(role)}
            </Link>

            <Link
              href="/mon-compte/favoris"
              onClick={() => setOuvert(false)}
              style={itemMenuStyle}
              className="hover:bg-gray-50 flex"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" style={{ flexShrink: 0 }}>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              Mes favoris
            </Link>

            <Link
              href="/mon-compte/mes-biens"
              onClick={() => setOuvert(false)}
              style={itemMenuStyle}
              className="hover:bg-gray-50 flex"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" style={{ flexShrink: 0 }}>
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Mes annonces
            </Link>

            <Link
              href="/mon-compte/parametres"
              onClick={() => setOuvert(false)}
              style={itemMenuStyle}
              className="hover:bg-gray-50 flex"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Paramètres
            </Link>

            {/* Séparateur */}
            <div className="mx-2 my-1" style={{ height: 1, background: "#F0EAD8" }} />

            <button
              onClick={seDeconnecter}
              style={{ ...itemMenuStyle, color: "var(--erreur)" }}
              className="hover:bg-red-50 w-full flex"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" style={{ flexShrink: 0 }}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
