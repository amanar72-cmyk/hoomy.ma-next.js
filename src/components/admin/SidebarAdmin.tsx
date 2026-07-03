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
  verif: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  file: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  ),
  calendrier: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  agents: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  clients: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  utilisateurs: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  leads: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.4 2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
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

// ── Navigation admin ──────────────────────────────────────────────────────────

const NAV_ADMIN = [
  { href: "/admin",               ico: "dashboard",    label: "Tableau de bord", exact: true },
  { href: "/admin/biens",         ico: "biens",        label: "Biens" },
  { href: "/admin/verifications", ico: "verif",        label: "Vérifications" },
  { href: "/admin/affectation",   ico: "file",         label: "File d'affectation" },
  { href: "/admin/leads",         ico: "leads",        label: "Leads" },
  { href: "/admin/demandes",      ico: "clients",      label: "Demandes" },
  { href: "/admin/calendrier",    ico: "calendrier",   label: "Calendrier" },
  { href: "/admin/agents",        ico: "agents",       label: "Agents" },
  { href: "/admin/clients",       ico: "clients",      label: "Clients" },
  { href: "/admin/utilisateurs",  ico: "utilisateurs", label: "Utilisateurs" },
] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  nomAdmin: string;
  avatarUrl: string | null;
  nbLeadsNouveaux?: number; // badge sur l'entrée « Leads »
};

// ── Composant ─────────────────────────────────────────────────────────────────

export default function SidebarAdmin({ nomAdmin, avatarUrl, nbLeadsNouveaux = 0 }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuMobile, setMenuMobile] = useState(false);
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
      transition: "background-color 0.18s ease, color 0.18s ease",
      borderLeft: "2px solid transparent",
    };
    if (actif) return { ...base, background: "rgba(212,175,55,0.13)", color: "#D4AF37", borderLeft: "2px solid #D4AF37" };
    if (survol) return { ...base, background: "rgba(255,255,255,0.06)", color: "#fff" };
    return { ...base, color: "#717171" };
  }

  const initiale = nomAdmin.charAt(0).toUpperCase();

  const corps = (
    <div className="flex flex-col h-full" style={{ background: "#111", minWidth: 240, width: 240 }}>

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <span style={{ fontFamily: "var(--font-marcellus),serif", color: "#fff", fontSize: 17, letterSpacing: 1 }}>
          HOOMY
        </span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: "#D4AF37", color: "#111", fontSize: 10, letterSpacing: 0.5 }}>
          Admin
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-4 pb-2 flex flex-col gap-0.5 overflow-y-auto">
        {NAV_ADMIN.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMenuMobile(false)}
            onMouseEnter={() => setHovered(item.href)}
            onMouseLeave={() => setHovered(null)}
            style={styleItem(item.href, "exact" in item ? item.exact : false)}
          >
            <span style={{ opacity: estActif(item.href, "exact" in item ? item.exact : false) ? 1 : 0.65 }}>
              {Ico[item.ico as keyof typeof Ico]}
            </span>
            {item.label}
            {/* Badge leads nouveaux */}
            {item.href === "/admin/leads" && nbLeadsNouveaux > 0 && (
              <span
                className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "#D4AF37", color: "#111", fontSize: 10, minWidth: 18, textAlign: "center" }}
              >
                {nbLeadsNouveaux > 99 ? "99+" : nbLeadsNouveaux}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Profil + déconnexion */}
      <div className="px-4 pb-5 pt-3 flex items-center gap-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
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
            {nomAdmin.split(" ")[0]}
          </p>
          <p className="text-xs" style={{ color: "#555" }}>Administrateur</p>
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

      {/* Mobile */}
      <div className="lg:hidden">
        <div
          className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4"
          style={{ background: "#111", height: 52, borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <span style={{ fontFamily: "var(--font-marcellus),serif", color: "#fff", fontSize: 15, letterSpacing: 1 }}>
            HOOMY
            <span className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded-full align-middle"
              style={{ background: "#D4AF37", color: "#111", fontSize: 9 }}>Admin</span>
          </span>
          <button type="button" onClick={() => setMenuMobile((v) => !v)}
            className="cursor-pointer p-1" style={{ color: "#ccc" }} aria-label="Menu">
            {menuMobile ? Ico.close : Ico.burger}
          </button>
        </div>

        <div
          className="fixed inset-0 z-30"
          style={{
            background: menuMobile ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0)",
            transition: "background-color 0.28s ease",
            pointerEvents: menuMobile ? "auto" : "none",
          }}
          onClick={() => setMenuMobile(false)}
        >
          <div
            style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              transform: menuMobile ? "translateX(0)" : "translateX(-100%)",
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
