"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Icônes SVG inline ─────────────────────────────────────────────────────────

const IcoDashboard = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const IcoCoeur = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const IcoRecherche = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IcoBoite = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

const IcoCalendrier = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IcoBien = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const IcoParametres = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IcoDeconnexion = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="21" x2="9" y2="12" />
  </svg>
);

const IcoMenu = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const IcoFermer = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ── Menu items ────────────────────────────────────────────────────────────────

// "Mes recherches" (/mon-compte/recherches — alertes sur recherche sauvegardée)
// est un placeholder inactif : masqué du menu tant que la fonctionnalité n'est
// pas développée (un menu vers une page vide dessert le produit). La page et
// son code restent intacts, juste non-listée — remettre l'entrée ici pour la
// réactiver le moment venu.
const MENU = [
  { href: "/mon-compte",                    label: "Tableau de bord",       icone: <IcoDashboard />,  exact: true },
  { href: "/mon-compte/favoris",            label: "Mes favoris",           icone: <IcoCoeur />,      exact: false },
  { href: "/mon-compte/demandes-recherche", label: "Ma recherche publiée",  icone: <IcoRecherche />,  exact: false },
  { href: "/mon-compte/demandes",           label: "Mes visites et messages", icone: <IcoBoite />,    exact: false },
  { href: "/mon-compte/visites",            label: "Mes visites",           icone: <IcoCalendrier />, exact: false },
  { href: "/mon-compte/mes-biens",          label: "Mes biens",             icone: <IcoBien />,       exact: false },
  { href: "/mon-compte/parametres",         label: "Mon compte",            icone: <IcoParametres />, exact: false },
];

// ── Composant ─────────────────────────────────────────────────────────────────

export default function SidebarClient({
  nomComplet,
  email,
  avatarUrl,
}: {
  nomComplet: string | null;
  email: string | null;
  avatarUrl: string | null;
}) {
  const [mobileOuvert, setMobileOuvert] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function seDeconnecter() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const prenom = nomComplet?.trim().split(" ")[0] ?? email?.split("@")[0] ?? "Vous";
  const initiale = prenom[0]?.toUpperCase() ?? "?";

  function estActif(item: typeof MENU[0]) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  const contenuSidebar = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center justify-between" style={{ borderBottom: "1px solid #F0EDE5" }}>
        <span
          className="text-lg font-normal tracking-wide"
          style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}
        >
          HOOMY<span style={{ color: "#D4AF37" }}>.MA</span>
        </span>
        {/* Fermer sur mobile */}
        <button
          type="button"
          onClick={() => setMobileOuvert(false)}
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-50"
          style={{ color: "#9DB8AD" }}
        >
          <IcoFermer />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="flex flex-col gap-0.5">
          {MENU.map((item) => {
            const actif = estActif(item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOuvert(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: actif ? "#0F4C3A" : "transparent",
                    color: actif ? "#fff" : "#3D4A42",
                    textDecoration: "none",
                  }}
                >
                  <span style={{ opacity: actif ? 1 : 0.65, flexShrink: 0 }}>{item.icone}</span>
                  {item.label}
                  {actif && (
                    <span
                      className="ml-auto w-1.5 h-1.5 rounded-full"
                      style={{ background: "#D4AF37" }}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Séparateur + Publier un bien */}
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid #F0EDE5" }}>
          <Link
            href="/publier"
            onClick={() => setMobileOuvert(false)}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: "#D4AF37", color: "#0F4C3A", textDecoration: "none" }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Publier un bien
          </Link>
        </div>
      </nav>

      {/* Bas : profil + déconnexion */}
      <div className="px-3 py-4" style={{ borderTop: "1px solid #F0EDE5" }}>
        <div className="flex items-center gap-3 px-2 mb-3">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: "#0F4C3A", color: "#D4AF37" }}
            >
              {initiale}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "#1f2a24" }}>
              {nomComplet ?? prenom}
            </p>
            <p className="text-xs truncate" style={{ color: "#9DB8AD" }}>
              {email}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={seDeconnecter}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm transition-colors hover:bg-red-50"
          style={{ color: "#DC2626" }}
        >
          <IcoDeconnexion />
          Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Bouton hamburger — fixe en haut à gauche sur mobile */}
      <button
        type="button"
        onClick={() => setMobileOuvert(true)}
        className="md:hidden fixed top-4 left-4 z-40 w-9 h-9 flex items-center justify-center rounded-xl shadow-md"
        style={{ background: "#0F4C3A", color: "#fff" }}
        aria-label="Ouvrir le menu"
      >
        <IcoMenu />
      </button>

      {/* Overlay backdrop mobile */}
      {mobileOuvert && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{ background: "rgba(15,76,58,0.35)", backdropFilter: "blur(2px)" }}
          onClick={() => setMobileOuvert(false)}
        />
      )}

      {/* Sidebar mobile (drawer) */}
      <aside
        className={`md:hidden fixed top-0 left-0 h-full z-50 transition-transform duration-300 ${
          mobileOuvert ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: 272, background: "#fff", boxShadow: "4px 0 24px rgba(15,76,58,0.12)" }}
      >
        {contenuSidebar}
      </aside>

      {/* Sidebar desktop — toujours visible */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0"
        style={{
          width: 260,
          background: "#fff",
          borderRight: "1px solid #F0EDE5",
          minHeight: "100vh",
        }}
      >
        {contenuSidebar}
      </aside>
    </>
  );
}
