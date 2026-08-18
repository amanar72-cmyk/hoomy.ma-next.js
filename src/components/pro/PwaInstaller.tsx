"use client";

import { useEffect, useState } from "react";
import { estAppNative } from "@/lib/mobile/natif";

// Typage minimal de l'événement natif beforeinstallprompt
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstaller() {
  const [inviteInstall, setInviteInstall] = useState<BeforeInstallPromptEvent | null>(null);
  const [installe, setInstalle] = useState(false);
  const [ferme, setFerme] = useState(false);

  useEffect(() => {
    // Dans l'application iOS, rien de tout ceci n'a de sens : l'app EST déjà
    // installée, et le Service Worker ferait doublon avec le cache de la
    // WebView tout en risquant de servir des chunks périmés après une mise à
    // jour du site. On sort avant toute inscription.
    if (estAppNative()) {
      setInstalle(true);
      return;
    }

    // Le SW (scope "/") fait du cache-first sur /_next/static/. En prod les chunks
    // sont hashés → sûr. En DEV/localhost, les chunks ne sont pas hashés de la même
    // façon : le SW sert des bundles périmés et casse le HMR
    // (« module factory is not available »). On ne l'enregistre donc qu'en prod,
    // et en dev on désenregistre tout SW existant + on purge ses caches pour
    // auto-réparer le navigateur.
    if ("serviceWorker" in navigator) {
      const hote = window.location.hostname;
      const estProd =
        process.env.NODE_ENV === "production" &&
        hote !== "localhost" &&
        hote !== "127.0.0.1";

      if (estProd) {
        navigator.serviceWorker
          .register("/sw-pro.js", { scope: "/" })
          .catch((err) => console.warn("[HOOMY PRO] SW non enregistré :", err));
      } else {
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => regs.forEach((r) => r.unregister()))
          .catch(() => {});
        if ("caches" in window) {
          caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
        }
      }
    }

    // Détection du prompt d'installation natif (Chrome/Android)
    const handler = (e: Event) => {
      e.preventDefault();
      setInviteInstall(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Si déjà installée en mode standalone, ne pas afficher le bandeau
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalle(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  async function installer() {
    if (!inviteInstall) return;
    await inviteInstall.prompt();
    const { outcome } = await inviteInstall.userChoice;
    if (outcome === "accepted") setInstalle(true);
    setInviteInstall(null);
  }

  // Pas de bandeau si : déjà installée, fermé, ou pas d'événement disponible
  if (installe || ferme || !inviteInstall) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl"
      style={{
        transform: "translateX(-50%)",
        background: "#1C1C1C",
        border: "1px solid #2A2A2A",
        maxWidth: "calc(100vw - 32px)",
        width: 340,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      {/* Icône */}
      <div
        className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: "#111" }}
      >
        <svg width="20" height="20" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" rx="12" fill="#111111"/>
          <path d="M12 27 L32 11 L52 27" stroke="#D4AF37" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="13" y="30" width="10" height="24" rx="2" fill="#FAF7F0"/>
          <rect x="41" y="30" width="10" height="24" rx="2" fill="#FAF7F0"/>
          <rect x="13" y="39" width="38" height="8" rx="2" fill="#FAF7F0"/>
        </svg>
      </div>

      {/* Texte */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight" style={{ color: "#FAF7F0" }}>
          Installer HOOMY PRO
        </p>
        <p className="text-xs mt-0.5 leading-tight" style={{ color: "#6B7280" }}>
          Accès rapide depuis votre écran d&apos;accueil
        </p>
      </div>

      {/* Bouton installer */}
      <button
        type="button"
        onClick={installer}
        className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
        style={{ background: "#D4AF37", color: "#111111" }}
      >
        Installer
      </button>

      {/* Fermer */}
      <button
        type="button"
        onClick={() => setFerme(true)}
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
        style={{ color: "#6B7280" }}
        aria-label="Fermer"
      >
        ✕
      </button>
    </div>
  );
}
