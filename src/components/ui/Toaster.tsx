"use client";

// Toast de confirmation HOOMY — notification glissante en bas d'écran
// (Vert Royal, icône Or), auto-fermée après 3,2 s.
//
// Usage depuis n'importe quel composant client :
//   import { afficherToast } from "@/components/ui/Toaster";
//   afficherToast("Ajouté aux favoris");
//   afficherToast("Connectez-vous pour sauvegarder", { lien: "/connexion", libelleLien: "Se connecter" });
//
// Le composant <Toaster /> est monté une seule fois dans le layout racine.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type DonneesToast = {
  message: string;
  lien?: string;
  libelleLien?: string;
};

const EVENEMENT = "hoomy:toast";

export function afficherToast(message: string, options?: { lien?: string; libelleLien?: string }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<DonneesToast>(EVENEMENT, { detail: { message, ...options } })
  );
}

export default function Toaster() {
  const [toast, setToast] = useState<DonneesToast | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function surToast(e: Event) {
      const detail = (e as CustomEvent<DonneesToast>).detail;
      if (!detail?.message) return;
      setToast(detail);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setToast(null), 3200);
    }
    window.addEventListener(EVENEMENT, surToast);
    return () => {
      window.removeEventListener(EVENEMENT, surToast);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 flex items-center gap-2.5 px-4 py-3 rounded-2xl"
      style={{
        bottom: "max(20px, env(safe-area-inset-bottom))",
        transform: "translateX(-50%)",
        zIndex: 10010,
        background: "#0F4C3A",
        color: "#fff",
        boxShadow: "0 12px 36px rgba(15,76,58,0.35)",
        animation: "hoomy-toast-in 0.3s ease",
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="#D4AF37" stroke="#D4AF37" strokeWidth="1.5" style={{ flexShrink: 0 }}>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <p className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">
        {toast.message}
      </p>
      {toast.lien && (
        <Link
          href={toast.lien}
          onClick={() => setToast(null)}
          className="text-sm font-semibold whitespace-nowrap hover:underline"
          style={{ color: "#D4AF37", textDecoration: "none" }}
        >
          {toast.libelleLien ?? "Voir"} →
        </Link>
      )}
    </div>
  );
}
