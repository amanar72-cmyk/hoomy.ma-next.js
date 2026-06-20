"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ModalDemandeVisite from "@/components/detail/ModalDemandeVisite";
import ModalEnvoyerMessage from "@/components/detail/ModalEnvoyerMessage";
import { calculerFraisAcquisition, formaterDH } from "@/lib/fraisAcquisition";

type Props = {
  prix: number;
  transaction: string;
  titre: string;
  chemin: string;
  bienId: string;
  agentId: string | null;
  slug: string;
};

export default function CarteContact({ prix, transaction, titre, chemin, bienId, agentId, slug }: Props) {
  const [lienCopie, setLienCopie] = useState(false);
  const [pageUrl, setPageUrl] = useState("");
  const [modalVisiteOuvert, setModalVisiteOuvert] = useState(false);
  const [modalMessageOuvert, setModalMessageOuvert] = useState(false);

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
      setTimeout(() => setLienCopie(false), 2200);
    });
  }

  return (
    <>
      <div
        className="rounded-2xl overflow-hidden sticky top-6"
        style={{
          background: "var(--fond-secondaire)",
          border: "1px solid #EDE7D7",
          boxShadow: "0 8px 32px rgba(15,76,58,0.10)",
        }}
      >
        {/* ── En-tête prix ─────────────────────────────────────────────── */}
        <div
          className="px-6 py-5"
          style={{ background: "linear-gradient(135deg, #0F4C3A 0%, #146C43 100%)" }}
        >
          <p className="text-xs font-medium mb-1 opacity-70" style={{ color: "#A8D5B8" }}>
            {transaction === "location" ? "Loyer mensuel" : "Prix de vente"}
          </p>
          <p
            className="text-2xl font-semibold leading-none"
            style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--accent)" }}
          >
            {prixFormate}
          </p>

          {/* Frais d'acquisition inline — vente uniquement */}
          {transaction !== "location" && (() => {
            const f = calculerFraisAcquisition(prix);
            return (
              <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs" style={{ color: "#A8D5B8" }}>Frais d'acquisition (estimés)</span>
                  <span className="text-xs font-semibold" style={{ color: "#D4AF37" }}>
                    +{formaterDH(f.totalFrais)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "#A8D5B8" }}>Coût total réel</span>
                  <span className="text-xs font-bold" style={{ color: "#fff" }}>
                    {formaterDH(f.coutTotal)}
                  </span>
                </div>
                <Link
                  href={`/frais-acquisition?prix=${prix}`}
                  className="block mt-2 text-xs underline-offset-2 hover:underline"
                  style={{ color: "rgba(212,175,55,0.75)", textDecoration: "none" }}
                >
                  Voir le détail des frais →
                </Link>
              </div>
            );
          })()}

          {/* Bouton simulateur de crédit — vente uniquement */}
          {transaction !== "location" && (
            <Link
              href={`/simulateur-credit?prix=${prix}`}
              className="flex items-center justify-center gap-2 mt-2 py-2.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-90"
              style={{
                background: "rgba(212,175,55,0.10)",
                color: "#A07C1E",
                border: "1px solid rgba(212,175,55,0.35)",
                textDecoration: "none",
              }}
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="2" y="5" width="20" height="14" rx="2"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
              Simuler mon crédit
            </Link>
          )}
        </div>

        <div className="px-6 py-5 flex flex-col gap-3">

          {/* ── Boutons principaux ─────────────────────────────────────── */}
          <button
            type="button"
            onClick={() => setModalVisiteOuvert(true)}
            className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all hover:shadow-md hover:-translate-y-px cursor-pointer flex items-center justify-center gap-2"
            style={{ background: "var(--primaire)", color: "var(--fond-secondaire)" }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Demander une visite
          </button>

          <button
            type="button"
            onClick={() => setModalMessageOuvert(true)}
            className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all hover:bg-opacity-10 cursor-pointer flex items-center justify-center gap-2"
            style={{ border: "1.5px solid #0F4C3A", color: "var(--primaire)", background: "transparent" }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Envoyer un message
          </button>

          <a
            href={`https://wa.me/212600000000?text=${messageWA}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:shadow-md hover:-translate-y-px"
            style={{ background: "#25D366", color: "var(--fond-secondaire)", textDecoration: "none" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Contacter sur WhatsApp
          </a>

          {/* ── Réassurance ──────────────────────────────────────────────── */}
          <div
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl"
            style={{ background: "var(--fond-vert-leger)" }}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="var(--primaire-clair)" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <p className="text-xs font-medium" style={{ color: "var(--primaire-clair)" }}>
              Réponse sous 24h · Conseiller dédié
            </p>
          </div>

          {/* ── Séparateur ────────────────────────────────────────────────── */}
          <div style={{ height: 1, background: "var(--bordure-legere)", margin: "4px 0" }} />

          {/* ── Partager ─────────────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-medium mb-3" style={{ color: "var(--texte-brun)" }}>Partager ce bien</p>
            <div className="flex gap-2">

              {/* Facebook */}
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Partager sur Facebook"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:opacity-80"
                style={{ background: "#1877F2", color: "var(--fond-secondaire)", textDecoration: "none" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>

              {/* WhatsApp partage */}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${titre} — ${prixFormate}\n${pageUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Partager sur WhatsApp"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:opacity-80"
                style={{ background: "#25D366", color: "var(--fond-secondaire)", textDecoration: "none" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>

              {/* Copier lien */}
              <button
                type="button"
                onClick={copierLien}
                title="Copier le lien"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer hover:opacity-80"
                style={{
                  background: lienCopie ? "var(--primaire-clair)" : "var(--bordure-legere)",
                  color: lienCopie ? "var(--fond-secondaire)" : "var(--texte-chaud)",
                }}
              >
                {lienCopie ? (
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12l5 5 9-9" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>

            </div>

            {/* ── Télécharger la carte de partage ───────────────────────── */}
            <a
              href={`/api/og?slug=${slug}`}
              download={`hoomy-${slug}.png`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full mt-1 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all hover:opacity-80"
              style={{
                background: "var(--fond-accent)",
                color: "var(--texte-chaud)",
                textDecoration: "none",
                border: "1px dashed #D4C9A8",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Télécharger la carte de partage
            </a>
          </div>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {modalVisiteOuvert && (
        <ModalDemandeVisite
          bienId={bienId}
          agentId={agentId}
          titreBien={titre}
          onClose={() => setModalVisiteOuvert(false)}
        />
      )}
      {modalMessageOuvert && (
        <ModalEnvoyerMessage
          bienId={bienId}
          agentId={agentId}
          titreBien={titre}
          onClose={() => setModalMessageOuvert(false)}
        />
      )}
    </>
  );
}
