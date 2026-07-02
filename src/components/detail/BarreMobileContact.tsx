"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ModalDemandeVisite from "@/components/detail/ModalDemandeVisite";
import { formaterPrix } from "@/lib/format";
import { CONTACT } from "@/lib/contact";

type Props = {
  prix: number;
  transaction: string;
  titre: string;
  reference?: string | null;
  ville: string;
  bienId: string;
  agentId: string | null;
  telephone?: string;
};

export default function BarreMobileContact({
  prix,
  transaction,
  titre,
  reference,
  ville,
  bienId,
  agentId,
  telephone = CONTACT.whatsappNumero,
}: Props) {
  const [pageUrl, setPageUrl] = useState("");
  const [favori, setFavori] = useState(false);
  const [partageOk, setPartageOk] = useState(false);
  const [modalVisiteOuvert, setModalVisiteOuvert] = useState(false);

  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  const prixFormate = formaterPrix(prix, transaction);
  const messageWA = encodeURIComponent(
    `Bonjour, je suis intéressé(e) par "${titre}" affiché à ${prixFormate} sur HOOMY.MA.\n${pageUrl}`
  );

  function partager() {
    const url = pageUrl || window.location.href;
    if (navigator.share) {
      navigator.share({ title: titre, url }).catch(() => null);
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setPartageOk(true);
        setTimeout(() => setPartageOk(false), 2000);
      });
    }
  }

  return (
    <>
      {/* Pill flottant — caché sur ≥ lg — z-[10000] pour passer au-dessus de la bulle IA */}
      <div
        className="lg:hidden fixed bottom-4 left-3 right-3"
        style={{ zIndex: 10000 }}
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "var(--fond-secondaire)",
            border: "1px solid var(--bordure)",
            boxShadow: "0 6px 28px rgba(0,0,0,0.16)",
          }}
        >
          {/* ── Ligne 1 : ref+ville | PRIX | favoris+partager ── */}
          <div
            className="grid px-4 pt-4 pb-2.5"
            style={{ gridTemplateColumns: "1fr auto 1fr", gap: "8px", alignItems: "center", borderBottom: "1px solid var(--bordure)" }}
          >
            {/* Gauche : référence + ville */}
            <div className="flex flex-col gap-0.5 min-w-0">
              {reference && (
                <span
                  className="text-xs font-mono leading-none"
                  style={{ color: "var(--texte-tertiaire)" }}
                >
                  {reference}
                </span>
              )}
              <span className="text-xs font-medium truncate" style={{ color: "var(--primaire)" }}>
                {ville}
              </span>
            </div>

            {/* Centre : prix */}
            <div className="text-center flex-shrink-0">
              <p
                className="font-semibold leading-none whitespace-nowrap"
                style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--accent)", fontSize: "1.15rem" }}
              >
                {prixFormate}
              </p>
            </div>

            {/* Droite : favoris + partager */}
            <div className="flex items-center gap-1.5 justify-end">
              <button
                type="button"
                onClick={() => setFavori((v) => !v)}
                aria-label="Favoris"
                className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
                style={{
                  background: favori ? "rgba(212,175,55,0.12)" : "var(--fond-principal)",
                  border: `1px solid ${favori ? "#D4AF37" : "var(--bordure)"}`,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill={favori ? "#D4AF37" : "none"} stroke={favori ? "#D4AF37" : "var(--texte-tertiaire)"} strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>

              <button
                type="button"
                onClick={partager}
                aria-label="Partager"
                className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
                style={{ background: "var(--fond-principal)", border: "1px solid var(--bordure)" }}
              >
                {partageOk ? (
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--primaire-clair)" strokeWidth="2.5">
                    <path d="M5 12l5 5 9-9" />
                  </svg>
                ) : (
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--texte-tertiaire)" strokeWidth="2">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* ── Ligne 2 : boutons d'action ── */}
          <div className="flex items-center gap-2 px-4 py-3.5">

            {/* Appeler */}
            <a
              href={`tel:+${telephone}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-opacity hover:opacity-90"
              style={{ background: "var(--primaire)", color: "var(--fond-secondaire)", textDecoration: "none" }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.16 6.16l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z" />
              </svg>
              Appeler
            </a>

            {/* WhatsApp */}
            <a
              href={`https://wa.me/${telephone}?text=${messageWA}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-opacity hover:opacity-90"
              style={{ background: "#25D366", color: "#fff", textDecoration: "none" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </a>

            {/* Financement — vente uniquement */}
            {transaction !== "location" && (
              <Link
                href={`/simulateur-credit?prix=${prix}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-opacity hover:opacity-90"
                style={{
                  background: "rgba(212,175,55,0.12)",
                  color: "#9A7A1A",
                  border: "1px solid rgba(212,175,55,0.4)",
                  textDecoration: "none",
                }}
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                Crédit
              </Link>
            )}

          </div>
        </div>
      </div>

      {modalVisiteOuvert && (
        <ModalDemandeVisite
          bienId={bienId}
          agentId={agentId}
          titreBien={titre}
          onClose={() => setModalVisiteOuvert(false)}
        />
      )}
    </>
  );
}
