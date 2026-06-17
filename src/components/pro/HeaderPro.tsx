"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  nomUtilisateur: string;
  role: string;
  titre?: string;
  notifications?: number;
};

export default function HeaderPro({ nomUtilisateur, role, titre, notifications = 3 }: Props) {
  const router = useRouter();
  const [menuOuvert, setMenuOuvert] = useState(false);

  async function seDeconnecter() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  const initiales = nomUtilisateur
    .split(" ")
    .map((m) => m.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b"
      style={{ background: "#fff", borderColor: "#F0EDE5", minHeight: 64 }}>

      {/* Titre de page (optionnel) */}
      <div>
        {titre && (
          <h1 className="text-lg font-normal" style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
            {titre}
          </h1>
        )}
      </div>

      {/* Actions droite */}
      <div className="flex items-center gap-3">

        {/* Cloche notifications */}
        <button type="button" className="relative p-2 rounded-xl hover:bg-gray-50 cursor-pointer"
          style={{ color: "#6B7A71" }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {notifications > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 flex items-center justify-center text-xs font-bold rounded-full"
              style={{ background: "#D4AF37", color: "#0F4C3A", fontSize: 10 }}>
              {notifications > 9 ? "9+" : notifications}
            </span>
          )}
        </button>

        {/* Avatar + menu */}
        <div className="relative">
          <button type="button" onClick={() => setMenuOuvert((v) => !v)}
            className="flex items-center gap-2 cursor-pointer"
            style={{ color: "#3D4A42" }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: "#0F4C3A", color: "#D4AF37" }}>
              {initiales}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium leading-tight" style={{ color: "#1f2a24" }}>
                {nomUtilisateur.split(" ")[0]}
              </p>
              <p className="text-xs capitalize" style={{ color: "#9DB8AD" }}>{role}</p>
            </div>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
              className="hidden md:block" style={{ color: "#9DB8AD" }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {menuOuvert && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOuvert(false)} />
              <div className="absolute right-0 top-12 z-20 rounded-2xl shadow-xl border py-2 min-w-[180px]"
                style={{ background: "#fff", borderColor: "#F0EDE5", boxShadow: "0 8px 32px rgba(15,76,58,0.12)" }}>
                <Link href="/pro/compte" onClick={() => setMenuOuvert(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50"
                  style={{ color: "#3D4A42" }}>
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Mon compte
                </Link>
                <Link href="/pro/ressources" onClick={() => setMenuOuvert(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50"
                  style={{ color: "#3D4A42" }}>
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4" />
                  </svg>
                  Paramètres
                </Link>
                <div className="my-1 mx-3 border-t" style={{ borderColor: "#F0EDE5" }} />
                <button type="button" onClick={seDeconnecter}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-red-50 cursor-pointer"
                  style={{ color: "#DC2626" }}>
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
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
