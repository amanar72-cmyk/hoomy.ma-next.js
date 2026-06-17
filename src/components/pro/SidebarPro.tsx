"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Icônes SVG inline (lucide-compatible)
const icones: Record<string, React.ReactNode> = {
  file: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  ),
  biens: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  team: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  neuf: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="7" width="20" height="15" rx="1" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M12 12v5M9.5 12h5" />
    </svg>
  ),
  catalogue: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  ),
  calendrier: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  contacts: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  leads: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  demandes: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  ),
  reseau: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  ),
  quartiers: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  ressources: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  partenariats: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  compte: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
};

const NAV: { href: string; icone: keyof typeof icones; label: string; exact?: boolean }[] = [
  { href: "/pro/file",         icone: "file",        label: "File d'affectation", exact: false },
  { href: "/pro/biens",        icone: "biens",       label: "Mes biens",          exact: false },
  { href: "/pro/team",         icone: "team",        label: "Ma Team",           exact: false },
  { href: "/pro/neuf",         icone: "neuf",        label: "Immobilier neuf",   exact: false },
  { href: "/pro/catalogue-neuf", icone: "catalogue", label: "Catalogue neuf",    exact: false },
  { href: "/pro/calendrier",   icone: "calendrier",  label: "Mon calendrier",    exact: false },
  { href: "/pro/contacts",     icone: "contacts",    label: "Mes contacts",      exact: false },
  { href: "/pro/leads",        icone: "leads",       label: "Leads",             exact: false },
  { href: "/pro/demandes",     icone: "demandes",    label: "Mes demandes",      exact: false },
  { href: "/pro/reseau",       icone: "reseau",      label: "Mon réseau",        exact: false },
  { href: "/pro/quartiers",    icone: "quartiers",   label: "Mes Quartiers",     exact: false },
  { href: "/pro/ressources",   icone: "ressources",  label: "Mes ressources",    exact: false },
  { href: "/pro/partenariats", icone: "partenariats",label: "Mes partenariats",  exact: false },
  { href: "/pro/compte",       icone: "compte",      label: "Mon compte",        exact: false },
];

type Props = {
  nomUtilisateur: string;
  role: string;
  avatarUrl?: string | null;
};

export default function SidebarPro({ nomUtilisateur, role, avatarUrl }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);

  async function seDeconnecter() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  function estActif(href: string) {
    return pathname.startsWith(href);
  }

  const contenu = (
    <div className="flex flex-col h-full" style={{ background: "#0F4C3A", minWidth: 256 }}>
      {/* En-tête */}
      <div className="px-5 pt-6 pb-5 border-b" style={{ borderColor: "#1a6650" }}>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-wide"
            style={{ fontFamily: "var(--font-marcellus),serif", color: "#fff" }}>
            HOOMY.MA
          </span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: "#D4AF37", color: "#0F4C3A" }}>
            Pro
          </span>
        </div>
        <p className="text-xs mt-1 capitalize" style={{ color: "#9DB8AD" }}>{role}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const actif = estActif(item.href);
          return (
            <Link key={item.href} href={item.href}
              onClick={() => setOuvert(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={actif
                ? { background: "#D4AF37", color: "#0F4C3A" }
                : { color: "#C4D8CE" }
              }>
              <span style={{ opacity: actif ? 1 : 0.75 }}>{icones[item.icone]}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Pied — profil + déconnexion */}
      <div className="px-4 pb-5 pt-4 border-t" style={{ borderColor: "#1a6650" }}>
        <div className="flex items-center gap-3 mb-3">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: "#D4AF37", color: "#0F4C3A" }}>
              {nomUtilisateur.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "#fff" }}>{nomUtilisateur}</p>
            <p className="text-xs capitalize" style={{ color: "#9DB8AD" }}>{role}</p>
          </div>
        </div>
        <button type="button" onClick={seDeconnecter}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm cursor-pointer transition-all"
          style={{ color: "#9DB8AD" }}>
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
      {/* Desktop sidebar fixe */}
      <aside className="hidden lg:flex flex-col flex-shrink-0"
        style={{ width: 256, minHeight: "100vh", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        {contenu}
      </aside>

      {/* Mobile : barre supérieure + tiroir overlay */}
      <div className="lg:hidden">
        <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3"
          style={{ background: "#0F4C3A" }}>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-sm"
              style={{ fontFamily: "var(--font-marcellus),serif" }}>HOOMY.MA</span>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "#D4AF37", color: "#0F4C3A" }}>Pro</span>
          </div>
          <button type="button" onClick={() => setOuvert((v) => !v)}
            className="text-white p-1" aria-label="Menu">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              {ouvert
                ? <path d="M6 18L18 6M6 6l12 12" />
                : <path d="M3 12h18M3 6h18M3 18h18" />}
            </svg>
          </button>
        </div>

        {ouvert && (
          <div className="fixed inset-0 z-30" style={{ background: "rgba(0,0,0,0.45)" }}
            onClick={() => setOuvert(false)}>
            <div className="absolute left-0 top-0 bottom-0 flex flex-col" style={{ width: 272 }}
              onClick={(e) => e.stopPropagation()}>
              {contenu}
            </div>
          </div>
        )}

        <div style={{ height: 52 }} />
      </div>
    </>
  );
}
