"use client";

import { useState, useEffect } from "react";

type Props = {
  prix: number;
  transaction: string;
  titre: string;
  chemin: string; // ex: "acheter/villa-marrakech"
};

function IconWA() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function IconFB() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function IconLien() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M5 12l5 5 9-9" />
    </svg>
  );
}

export default function CarteContact({ prix, transaction, titre, chemin }: Props) {
  const [lienCopie, setLienCopie] = useState(false);
  const [pageUrl, setPageUrl] = useState("");

  // URL réelle disponible seulement côté client
  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  const prixFormate = `${prix.toLocaleString("fr-FR")} DH${transaction === "location" ? "/mois" : ""}`;
  const messageWA = encodeURIComponent(
    `Bonjour, je suis intéressé(e) par "${titre}" affiché à ${prixFormate} sur HOOMY.MA.\n${pageUrl}`
  );

  function copierLien() {
    navigator.clipboard.writeText(pageUrl || window.location.href).then(() => {
      setLienCopie(true);
      setTimeout(() => setLienCopie(false), 2000);
    });
  }

  return (
    <div
      className="rounded-2xl p-6 sticky top-24"
      style={{
        background: "#fff",
        border: "1px solid #E8E2D2",
        boxShadow: "0 4px 24px rgba(15,76,58,0.08)",
      }}
    >
      {/* Prix */}
      <p className="text-2xl font-semibold mb-1" style={{ color: "#D4AF37" }}>
        {prixFormate}
      </p>

      {/* Titre court */}
      <p className="text-sm mb-5 leading-snug line-clamp-2" style={{ color: "#6B6450" }}>
        {titre}
      </p>

      <hr style={{ borderColor: "#E8E2D2", marginBottom: 20 }} />

      {/* Bouton principal */}
      <button
        className="w-full py-3 rounded-xl text-sm font-semibold mb-3 transition-opacity hover:opacity-90 cursor-pointer"
        style={{ background: "#0F4C3A", color: "#fff" }}
      >
        Demander une visite
      </button>

      {/* Bouton secondaire */}
      <button
        className="w-full py-3 rounded-xl text-sm font-semibold mb-3 border transition-colors hover:bg-gray-50 cursor-pointer"
        style={{ borderColor: "#0F4C3A", color: "#0F4C3A" }}
      >
        Envoyer un message
      </button>

      {/* WhatsApp */}
      <a
        href={`https://wa.me/212600000000?text=${messageWA}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2.5 mb-4 transition-opacity hover:opacity-90"
        style={{ background: "#25D366", color: "#fff", textDecoration: "none" }}
      >
        <IconWA />
        Contacter sur WhatsApp
      </a>

      {/* Note réassurance */}
      <p className="text-xs text-center mb-5" style={{ color: "#9DB8AD" }}>
        Réponse sous 24h · Conseiller HOOMY dédié
      </p>

      <hr style={{ borderColor: "#E8E2D2", marginBottom: 16 }} />

      {/* Partager */}
      <p className="text-xs font-medium mb-3" style={{ color: "#888" }}>Partager ce bien</p>
      <div className="flex gap-3">

        {/* Facebook */}
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
          style={{ background: "#1877F2", color: "#fff", textDecoration: "none" }}
          title="Partager sur Facebook"
        >
          <IconFB />
        </a>

        {/* WhatsApp partage */}
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${titre} — ${prixFormate}\n${pageUrl}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
          style={{ background: "#25D366", color: "#fff", textDecoration: "none" }}
          title="Partager sur WhatsApp"
        >
          <IconWA />
        </a>

        {/* Copier le lien */}
        <button
          onClick={copierLien}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer"
          style={{
            background: lienCopie ? "#146C43" : "#F2ECDD",
            color: lienCopie ? "#fff" : "#6B6450",
          }}
          title="Copier le lien"
        >
          {lienCopie ? <IconCheck /> : <IconLien />}
        </button>

      </div>
    </div>
  );
}
