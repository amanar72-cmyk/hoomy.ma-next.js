"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  nomUtilisateur: string;
  role: string;
};

const LABELS: Record<string, string> = {
  "/pro":              "Tableau de bord",
  "/pro/biens":        "Mes biens",
  "/pro/file":         "File d'affectation",
  "/pro/leads":        "Leads",
  "/pro/contacts":     "Contacts",
  "/pro/calendrier":   "Calendrier",
  "/pro/demandes":     "Demandes",
  "/pro/catalogue-neuf": "Catalogue neuf",
  "/pro/compte":       "Mon compte",
};

export default function HeaderPro({ nomUtilisateur, role }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOuvert, setMenuOuvert] = useState(false);

  async function seDeconnecter() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/connexion");
  }

  // Titre de la page courante
  const titrage = Object.entries(LABELS)
    .filter(([route]) => route !== "/pro")
    .find(([route]) => pathname.startsWith(route));
  const titre = titrage ? titrage[1] : pathname === "/pro" ? "Tableau de bord" : "";

  const initiales = nomUtilisateur.split(" ").map((m) => m.charAt(0)).slice(0, 2).join("").toUpperCase();

  return (
    <header
      className="flex items-center justify-between px-6"
      style={{
        background: "#fff",
        borderBottom: "1px solid #EBEBEB",
        height: 56,
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      {/* Titre */}
      <h1 className="text-sm font-semibold" style={{ color: "#111", letterSpacing: 0.1 }}>
        {titre}
      </h1>

      {/* Actions droite */}
      <div className="flex items-center gap-2">

        {/* Avatar + menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOuvert((v) => !v)}
            className="flex items-center gap-2.5 cursor-pointer rounded-xl px-2 py-1.5 hover:bg-gray-50 transition-colors duration-150"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "#111", color: "#D4AF37" }}
            >
              {initiales}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold leading-tight" style={{ color: "#111" }}>
                {nomUtilisateur.split(" ")[0]}
              </p>
              <p className="text-xs capitalize leading-tight" style={{ color: "#999" }}>{role}</p>
            </div>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#999" strokeWidth="2.5"
              className="hidden sm:block" style={{ marginLeft: 2 }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {menuOuvert && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOuvert(false)} />
              <div
                className="absolute right-0 top-11 z-20 rounded-xl border py-1.5 min-w-[172px]"
                style={{
                  background: "#fff",
                  borderColor: "#E8E8E8",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.1)",
                }}
              >
                <Link href="/pro/compte" onClick={() => setMenuOuvert(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs hover:bg-gray-50 transition-colors duration-100"
                  style={{ color: "#333", textDecoration: "none" }}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                  Mon compte
                </Link>
                <div className="my-1 mx-3" style={{ height: 1, background: "#F0F0F0" }} />
                <button type="button" onClick={seDeconnecter}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs hover:bg-red-50 transition-colors duration-100 cursor-pointer"
                  style={{ color: "#D33" }}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Déconnexion
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
