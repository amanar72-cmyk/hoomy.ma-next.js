"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formaterPrix } from "@/lib/format";
import type { BienPublic } from "@/lib/types";

// ── Constantes ────────────────────────────────────────────────────────────────

const LARGEUR_CARTE = 310; // px — desktop (animation auto)
const GAP           = 18;  // px entre cartes
const PX_PAR_SEC    = 80;

// ── Icône localisation ────────────────────────────────────────────────────────

function IcPin() {
  return (
    <svg
      width="10" height="10" fill="none" viewBox="0 0 24 24"
      stroke="currentColor" strokeWidth="2"
      style={{ flexShrink: 0, marginTop: 1 }}
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

// ── Carte épurée — photo · prix · ville·quartier · référence ──────────────────

function CarteCarrousel({ bien }: { bien: BienPublic }) {
  const chemin = `/${bien.transaction === "location" ? "louer" : "acheter"}/${bien.slug ?? bien.id}`;
  const localisation = bien.quartier ? `${bien.ville} · ${bien.quartier}` : bien.ville;
  const prix = formaterPrix(bien.prix, bien.transaction);

  return (
    <Link
      href={chemin}
      draggable={false}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <article
        className="group"
        style={{
          background: "var(--fond-secondaire)",
          border: "1px solid #EDE7D7",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 2px 12px rgba(15,76,58,0.07)",
          transition: "transform 240ms cubic-bezier(0.4,0,0.2,1), box-shadow 240ms",
          userSelect: "none",
        }}
      >
        {/* ── Photo ──────────────────────────────────────────────────────── */}
        <div
          style={{
            position: "relative",
            aspectRatio: "4/3",
            overflow: "hidden",
            background: "#E8E2D2",
          }}
        >
          {bien.photos?.[0] ? (
            <img
              src={bien.photos[0]}
              alt={bien.titre}
              draggable={false}
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              className="transition-transform duration-500 group-hover:scale-[1.05]"
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(145deg, #0F4C3A, #146C43)",
              }}
            >
              <svg
                width="30" height="30" fill="none" viewBox="0 0 24 24"
                stroke="rgba(255,255,255,0.28)" strokeWidth="1.2"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
          )}

          {/* Badge À vendre / À louer */}
          <span
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              background:
                bien.transaction === "location"
                  ? "var(--accent)"
                  : "var(--primaire)",
              color:
                bien.transaction === "location"
                  ? "var(--primaire)"
                  : "var(--fond-secondaire)",
              fontSize: 10,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 99,
              letterSpacing: "0.03em",
            }}
          >
            {bien.transaction === "location" ? "À louer" : "À vendre"}
          </span>
        </div>

        {/* ── Infos ──────────────────────────────────────────────────────── */}
        <div style={{ padding: "13px 14px 15px" }}>
          <p
            style={{
              fontFamily: "var(--font-marcellus), serif",
              color: "var(--accent)",
              fontSize: "1.05rem",
              lineHeight: 1.2,
              marginBottom: 7,
            }}
          >
            {prix}
          </p>

          <p
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 5,
              fontSize: 12,
              color: "var(--texte-secondaire)",
              marginBottom: bien.reference ? 8 : 0,
              overflow: "hidden",
            }}
          >
            <IcPin />
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {localisation}
            </span>
          </p>

          {bien.reference && (
            <p
              style={{
                fontSize: 11,
                color: "var(--texte-pale)",
                fontFamily: "ui-monospace, monospace",
                letterSpacing: "0.02em",
              }}
            >
              Réf. {bien.reference}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function BiensVedette({ biens }: { biens: BienPublic[] }) {
  const [survol, setSurvol]             = useState(false);
  const [maintien, setMaintien]         = useState(false);
  const [motionReduit, setMotionReduit] = useState(false);

  const enPause = survol || maintien;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMotionReduit(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMotionReduit(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // ── Cas vide ──────────────────────────────────────────────────────────────
  if (biens.length === 0) {
    return (
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2
          className="text-3xl font-normal mb-8"
          style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}
        >
          Biens en vedette
        </h2>
        <p className="text-center py-16 text-sm" style={{ color: "var(--texte-tertiaire)" }}>
          Aucun bien disponible pour le moment.
        </p>
      </section>
    );
  }

  // ── Données pour l'animation desktop ─────────────────────────────────────
  const facteur    = biens.length <= 3 ? 4 : 2;
  const pctFin     = (100 / facteur).toFixed(4);
  const biensTrack = Array.from({ length: facteur }, () => biens).flat();
  const dureeS     = Math.max(15, (biens.length * (LARGEUR_CARTE + GAP)) / PX_PAR_SEC).toFixed(1);

  return (
    <section className="py-16">
      {/* Keyframe animation + masquage scrollbar webkit */}
      <style>{`
        @keyframes hoomyCarrousel {
          from { transform: translateX(0); }
          to   { transform: translateX(-${pctFin}%); }
        }
        .bv-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 mb-8 flex items-baseline justify-between">
        <h2
          className="text-3xl font-normal"
          style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}
        >
          Biens en vedette
        </h2>
        <Link
          href="/acheter"
          className="text-sm hover:underline"
          style={{ color: "var(--primaire-clair)", textDecoration: "none" }}
        >
          Voir tous les biens →
        </Link>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MOBILE (< md) — scroll-snap natif, swipe au doigt
          Alignement : paddingLeft 24 px = cohérent avec l'en-tête px-6.
          scroll-padding-left aligne le snap sur ce même offset.
          Largeur carte : min(310px, 82vw) → laisse ~18 vw visible à droite
          pour signaler qu'il y a d'autres cartes à swiper.
      ═══════════════════════════════════════════════════════════════════ */}
      <div
        className="bv-scroll md:hidden"
        style={{
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollSnapType: "x mandatory",
          scrollPaddingLeft: 24,
          scrollbarWidth: "none",
          paddingTop: 10,
          paddingBottom: 22,
        }}
      >
        <div
          className="flex"
          style={{ gap: GAP, paddingLeft: 24, paddingRight: 24 }}
        >
          {biens.map((bien) => (
            <div
              key={bien.id}
              style={{
                width: "min(310px, 82vw)",
                flexShrink: 0,
                scrollSnapAlign: "start",
              }}
            >
              <CarteCarrousel bien={bien} />
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          DESKTOP (md+) — animation automatique (ou scroll si motion réduit)
      ═══════════════════════════════════════════════════════════════════ */}
      {motionReduit ? (
        /* Scroll statique pour prefers-reduced-motion */
        <div
          className="bv-scroll hidden md:block"
          style={{
            overflowX: "auto",
            scrollbarWidth: "none",
            paddingLeft: 24,
            paddingRight: 24,
          }}
        >
          <div className="flex pb-2" style={{ gap: GAP, width: "fit-content" }}>
            {biens.map((bien) => (
              <div key={bien.id} style={{ width: LARGEUR_CARTE, flexShrink: 0 }}>
                <CarteCarrousel bien={bien} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Carrousel animé standard */
        <div
          className="hidden md:block"
          style={{ overflow: "hidden", paddingTop: 10, paddingBottom: 22 }}
          onMouseEnter={() => setSurvol(true)}
          onMouseLeave={() => { setSurvol(false); setMaintien(false); }}
          onMouseDown={() => setMaintien(true)}
          onMouseUp={() => setMaintien(false)}
        >
          <div
            className="flex"
            style={{
              gap: GAP,
              width: "fit-content",
              animation: `hoomyCarrousel ${dureeS}s linear infinite`,
              animationPlayState: enPause ? "paused" : "running",
            }}
          >
            {biensTrack.map((bien, i) => (
              <div
                key={`${bien.id}-${i}`}
                style={{ width: LARGEUR_CARTE, flexShrink: 0 }}
              >
                <CarteCarrousel bien={bien} />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
