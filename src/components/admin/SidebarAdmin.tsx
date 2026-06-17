"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/admin", icone: "📊", label: "Tableau de bord", exact: true },
  { href: "/admin/biens", icone: "🏠", label: "Biens", exact: false },
  { href: "/admin/verifications", icone: "✅", label: "Vérifications", exact: false },
  { href: "/admin/affectation", icone: "📋", label: "File d'affectation", exact: false },
  { href: "/admin/agents", icone: "🧑‍💼", label: "Agents", exact: false },
  { href: "/admin/clients", icone: "👤", label: "Clients", exact: false },
  { href: "/admin/utilisateurs", icone: "👥", label: "Utilisateurs", exact: false },
];

type Props = {
  nomAdmin: string;
  avatarUrl: string | null;
};

export default function SidebarAdmin({ nomAdmin, avatarUrl }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuMobile, setMenuMobile] = useState(false);

  async function seDeconnecter() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  function estActif(item: (typeof NAV_ITEMS)[0]) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  const contenuSidebar = (
    <div
      className="flex flex-col h-full"
      style={{ background: "#0F4C3A", color: "#fff", minWidth: 240 }}
    >
      {/* En-tête */}
      <div className="px-6 pt-8 pb-6 border-b" style={{ borderColor: "#1a6650" }}>
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-lg font-semibold tracking-wide"
            style={{ fontFamily: "var(--font-marcellus), serif", color: "#fff" }}
          >
            HOOMY.MA
          </span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: "#D4AF37", color: "#0F4C3A" }}
          >
            Admin
          </span>
        </div>
        <p className="text-xs" style={{ color: "#9DB8AD" }}>Panneau d'administration</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMenuMobile(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={
              estActif(item)
                ? { background: "#D4AF37", color: "#0F4C3A" }
                : { color: "#C4D8CE" }
            }
          >
            <span className="text-base">{item.icone}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Profil admin + déconnexion */}
      <div className="px-5 pb-6 pt-4 border-t" style={{ borderColor: "#1a6650" }}>
        <div className="flex items-center gap-3 mb-4">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: "#D4AF37", color: "#0F4C3A" }}
            >
              {nomAdmin.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "#fff" }}>
              {nomAdmin}
            </p>
            <p className="text-xs" style={{ color: "#9DB8AD" }}>Administrateur</p>
          </div>
        </div>
        <button
          type="button"
          onClick={seDeconnecter}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer"
          style={{ color: "#9DB8AD" }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Sidebar desktop */}
      <aside
        className="hidden lg:flex flex-col"
        style={{ width: 240, minHeight: "100vh", flexShrink: 0 }}
      >
        {contenuSidebar}
      </aside>

      {/* Barre mobile + tiroir */}
      <div className="lg:hidden">
        <div
          className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3"
          style={{ background: "#0F4C3A" }}
        >
          <span className="font-semibold text-white" style={{ fontFamily: "var(--font-marcellus), serif" }}>
            HOOMY Admin
          </span>
          <button
            type="button"
            onClick={() => setMenuMobile((v) => !v)}
            className="text-white p-1"
            aria-label="Menu"
          >
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              {menuMobile ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>

        {menuMobile && (
          <div
            className="fixed inset-0 z-20"
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={() => setMenuMobile(false)}
          >
            <div
              className="absolute left-0 top-0 bottom-0 flex flex-col"
              style={{ width: 260 }}
              onClick={(e) => e.stopPropagation()}
            >
              {contenuSidebar}
            </div>
          </div>
        )}

        {/* Espace pour la barre fixe */}
        <div style={{ height: 52 }} />
      </div>
    </>
  );
}
