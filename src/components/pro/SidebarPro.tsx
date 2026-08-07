"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Icônes SVG ────────────────────────────────────────────────────────────────

const Ico = {
  dashboard: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  biens: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  file: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  ),
  leads: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  calendrier: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  contacts: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  proprietaires: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  ),
  demandes: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  ),
  catalogue: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  ),
  compte: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
  logout: (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  burger: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  ),
  close: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

// ── Navigation agent ───────────────────────────────────────────────────────────

const NAV_AGENT = [
  { href: "/pro",              ico: "dashboard",  label: "Tableau de bord", exact: true },
  { href: "/pro/biens",        ico: "biens",      label: "Mes biens" },
  { href: "/pro/proprietaires", ico: "proprietaires", label: "Propriétaires" },
  { href: "/pro/file",         ico: "file",       label: "File d'affectation" },
  { href: "/pro/leads",        ico: "leads",      label: "Leads" },
  { href: "/pro/contacts",     ico: "contacts",   label: "Contacts" },
  { href: "/pro/calendrier",   ico: "calendrier", label: "Calendrier" },
  { href: "/pro/demandes",     ico: "demandes",   label: "Demandes de visite" },
  { href: "/pro/demandes-recherche", ico: "leads", label: "Recherches clients" },
  { href: "/pro/catalogue-neuf", ico: "catalogue", label: "Catalogue neuf" },
] as const;

const NAV_BAS = [
  { href: "/pro/compte", ico: "compte", label: "Mon compte" },
] as const;

// ── Types ──────────────────────────────────────────────────────────────────────

type Props = {
  nomUtilisateur: string;
  role: string;
  avatarUrl?: string | null;
};

// ── Composant ─────────────────────────────────────────────────────────────────

export default function SidebarPro({ nomUtilisateur, role, avatarUrl }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  async function seDeconnecter() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/connexion");
  }

  function estActif(href: string, exact = false) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  function styleItem(href: string, exact = false) {
    const actif = estActif(href, exact);
    const survol = hovered === href && !actif;
    const base: React.CSSProperties = {
      display: "flex", alignItems: "center", gap: 10,
      padding: "9px 12px", borderRadius: 10,
      fontSize: 13.5, fontWeight: 500, cursor: "pointer",
      textDecoration: "none",
      transition: "background-color 0.18s ease, color 0.18s ease, border-color 0.18s ease",
      borderLeft: "2px solid transparent",
    };
    if (actif) return { ...base, background: "rgba(212,175,55,0.13)", color: "#D4AF37", borderLeft: "2px solid #D4AF37" };
    if (survol) return { ...base, background: "rgba(255,255,255,0.06)", color: "#fff" };
    return { ...base, color: "#717171" };
  }

  const initiale = nomUtilisateur.charAt(0).toUpperCase();

  // Navigation : le catalogue des biens publiés est réservé aux agences
  // partenaires (et admin pour supervision) — inséré après « Mes biens ».
  const navItems = [...NAV_AGENT] as { href: string; ico: string; label: string; exact?: boolean }[];
  if (role === "agence" || role === "admin") {
    navItems.splice(2, 0, { href: "/pro/catalogue", ico: "catalogue", label: "Catalogue des biens" });
  }
  const badge = role === "admin" ? "Admin" : "Pro";

  const corps = (
    <div className="flex flex-col h-full" style={{ background: "#111", minWidth: 240, width: 240 }}>

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div>
          <span style={{ fontFamily: "var(--font-marcellus),serif", color: "#fff", fontSize: 17, letterSpacing: 1 }}>
            HOOMY
          </span>
          <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full align-middle"
            style={{ background: "#D4AF37", color: "#111", fontSize: 10, letterSpacing: 0.5 }}>
            {badge}
          </span>
        </div>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 px-3 pt-4 pb-2 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOuvert(false)}
            onMouseEnter={() => setHovered(item.href)}
            onMouseLeave={() => setHovered(null)}
            style={styleItem(item.href, "exact" in item ? item.exact : false)}
          >
            <span style={{ opacity: estActif(item.href, "exact" in item ? item.exact : false) ? 1 : 0.65 }}>
              {Ico[item.ico as keyof typeof Ico]}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Section basse — compte + déconnexion */}
      <div className="px-3 pb-5 pt-3 flex flex-col gap-0.5" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        {NAV_BAS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOuvert(false)}
            onMouseEnter={() => setHovered(item.href)}
            onMouseLeave={() => setHovered(null)}
            style={styleItem(item.href)}
          >
            <span style={{ opacity: estActif(item.href) ? 1 : 0.65 }}>
              {Ico[item.ico as keyof typeof Ico]}
            </span>
            {item.label}
          </Link>
        ))}

        {/* Profil + déconnexion */}
        <div className="flex items-center gap-3 px-3 pt-3 mt-1">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: "#D4AF37", color: "#111" }}>
              {initiale}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: "#E0E0E0" }}>
              {nomUtilisateur.split(" ")[0]}
            </p>
            <p className="text-xs capitalize" style={{ color: "#555" }}>{role}</p>
          </div>
          <button
            type="button"
            onClick={seDeconnecter}
            title="Déconnexion"
            onMouseEnter={() => setHovered("__logout")}
            onMouseLeave={() => setHovered(null)}
            className="cursor-pointer p-1.5 rounded-lg"
            style={{
              color: hovered === "__logout" ? "#fff" : "#555",
              background: hovered === "__logout" ? "rgba(255,255,255,0.08)" : "transparent",
              transition: "color 0.18s, background 0.18s",
            }}
          >
            {Ico.logout}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop — sidebar fixe */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0"
        style={{ width: 240, minHeight: "100vh", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}
      >
        {corps}
      </aside>

      {/* Mobile — barre supérieure + tiroir animé */}
      <div className="lg:hidden">
        <div
          className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4"
          style={{ background: "#111", height: 52, borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <span style={{ fontFamily: "var(--font-marcellus),serif", color: "#fff", fontSize: 15, letterSpacing: 1 }}>
            HOOMY
            <span className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded-full align-middle"
              style={{ background: "#D4AF37", color: "#111", fontSize: 9 }}>{badge}</span>
          </span>
          <button type="button" onClick={() => setOuvert((v) => !v)}
            className="cursor-pointer p-1" style={{ color: "#ccc" }} aria-label="Menu">
            {ouvert ? Ico.close : Ico.burger}
          </button>
        </div>

        {/* Overlay + tiroir — toujours rendu, animé via transform */}
        <div
          className="fixed inset-0 z-30"
          style={{
            background: ouvert ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0)",
            transition: "background-color 0.28s ease",
            pointerEvents: ouvert ? "auto" : "none",
          }}
          onClick={() => setOuvert(false)}
        >
          <div
            style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              transform: ouvert ? "translateX(0)" : "translateX(-100%)",
              transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {corps}
          </div>
        </div>

        <div style={{ height: 52 }} />
      </div>
    </>
  );
}
