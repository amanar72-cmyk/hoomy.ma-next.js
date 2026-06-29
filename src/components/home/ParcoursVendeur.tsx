"use client";

import { useEffect, useRef, useState } from "react";

// ── Icônes SVG inline ─────────────────────────────────────────────────────────

function IcoEnveloppe() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function IcoMaisonLoupe() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <circle cx="15.5" cy="15.5" r="2.5" />
      <line x1="17.5" y1="17.5" x2="20" y2="20" />
    </svg>
  );
}

function IcoDocument() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

function IcoCamera() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function IcoPersonnes() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IcoPoigneeMain() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

// ── Données des étapes ────────────────────────────────────────────────────────

const ETAPES = [
  {
    titre: "Réception de votre demande",
    description: "Vous déposez votre bien ou demandez une estimation en ligne ou par téléphone.",
    Icone: IcoEnveloppe,
  },
  {
    titre: "Estimation & visite du conseiller",
    description: "Un expert HOOMY évalue votre bien sur place et vous propose un prix de marché.",
    Icone: IcoMaisonLoupe,
  },
  {
    titre: "Signature du mandat",
    description: "Mandat de vente clair et transparent, encadré par le Dahir des Obligations et Contrats.",
    Icone: IcoDocument,
  },
  {
    titre: "Mise en valeur & diffusion",
    description: "Photos professionnelles, annonce premium et large visibilité sur tous les canaux.",
    Icone: IcoCamera,
  },
  {
    titre: "Recherche d'acheteurs qualifiés",
    description: "Visites organisées et gérées par HOOMY, acheteurs sérieux et solvables filtrés.",
    Icone: IcoPersonnes,
  },
  {
    titre: "Négociation puis compromis ou vente",
    description: "Nous négocions pour vous, puis vous accompagnons jusqu'au compromis signé chez le notaire.",
    Icone: IcoPoigneeMain,
  },
] as const;

// ── Composant principal ───────────────────────────────────────────────────────

export default function ParcoursVendeur() {
  const [etapeActive, setEtapeActive] = useState(0);
  const [reduitMotion, setReduitMotion] = useState(false);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Détecter prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduitMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduitMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Intersection Observer — active l'étape au centre du viewport
  useEffect(() => {
    if (reduitMotion) return;

    const observers: IntersectionObserver[] = [];

    stepRefs.current.forEach((el, index) => {
      if (!el) return;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) setEtapeActive(index);
          });
        },
        // Zone active = bande centrale de 20% du viewport
        { rootMargin: "-40% 0px -40% 0px", threshold: 0 },
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [reduitMotion]);

  return (
    <section
      aria-label="Parcours vendeur HOOMY"
      style={{ background: "#0a2418", padding: "96px 0" }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>

        {/* ── En-tête ────────────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: 72 }}>
          <p
            style={{
              fontSize: 11,
              fontFamily: "var(--font-outfit), sans-serif",
              letterSpacing: "0.18em",
              color: "#D4AF37",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            Vous vendez votre bien
          </p>
          <h2
            style={{
              fontFamily: "var(--font-marcellus), serif",
              fontSize: "clamp(28px, 5vw, 42px)",
              fontWeight: 400,
              color: "#FAF7F0",
              margin: "0 0 20px 0",
              lineHeight: 1.25,
            }}
          >
            Parcours vendeur
          </h2>
          <p
            style={{
              fontFamily: "var(--font-outfit), sans-serif",
              fontSize: 16,
              color: "rgba(250,247,240,0.55)",
              maxWidth: 460,
              margin: "0 auto",
              lineHeight: 1.7,
            }}
          >
            Nous vous accompagnons de A à Z pour vendre votre bien au meilleur prix, en toute sérénité.
          </p>
        </div>

        {/* ── Timeline ───────────────────────────────────────────────────── */}
        <div style={{ position: "relative" }}>

          {ETAPES.map((etape, index) => {
            const estActive = reduitMotion || index === etapeActive;
            const estPassee = !reduitMotion && index < etapeActive;
            const estAvenir = !reduitMotion && index > etapeActive;
            const estDerniere = index === ETAPES.length - 1;

            return (
              <div
                key={index}
                ref={(el) => { stepRefs.current[index] = el; }}
                style={{
                  display: "flex",
                  gap: 24,
                  opacity: estAvenir ? 0.35 : estPassee ? 0.6 : 1,
                  transition: reduitMotion ? "none" : "opacity 0.5s ease",
                }}
              >
                {/* ── Colonne gauche : pastille + trait ─────────────────── */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    flexShrink: 0,
                    width: 52,
                  }}
                >
                  {/* Pastille */}
                  <div
                    style={{
                      width: estActive ? 52 : 44,
                      height: estActive ? 52 : 44,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: reduitMotion ? "none" : "all 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)",
                      background: estActive
                        ? "#D4AF37"
                        : estPassee
                          ? "#1a4d3a"
                          : "transparent",
                      border: estActive
                        ? "none"
                        : estPassee
                          ? "2px solid rgba(212,175,55,0.5)"
                          : "2px solid rgba(250,247,240,0.15)",
                      color: estActive ? "#0a2418" : estPassee ? "#D4AF37" : "rgba(250,247,240,0.4)",
                      boxShadow: estActive
                        ? "0 0 0 8px rgba(212,175,55,0.15), 0 0 28px rgba(212,175,55,0.25)"
                        : "none",
                      zIndex: 1,
                      position: "relative",
                    }}
                  >
                    <etape.Icone />
                  </div>

                  {/* Trait vertical vers l'étape suivante */}
                  {!estDerniere && (
                    <div
                      style={{
                        width: 2,
                        flex: 1,
                        minHeight: 48,
                        background: estPassee
                          ? "linear-gradient(to bottom, rgba(212,175,55,0.6), rgba(212,175,55,0.2))"
                          : "rgba(250,247,240,0.08)",
                        transition: reduitMotion ? "none" : "background 0.5s ease",
                        marginTop: 4,
                        marginBottom: 4,
                      }}
                    />
                  )}
                </div>

                {/* ── Colonne droite : contenu ───────────────────────────── */}
                <div
                  style={{
                    paddingBottom: estDerniere ? 0 : 48,
                    paddingTop: 10,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {/* Numéro */}
                  <p
                    style={{
                      fontFamily: "var(--font-outfit), sans-serif",
                      fontSize: 11,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: estActive ? "#D4AF37" : "rgba(212,175,55,0.4)",
                      marginBottom: 6,
                      transition: reduitMotion ? "none" : "color 0.4s ease",
                    }}
                  >
                    Étape {String(index + 1).padStart(2, "0")}
                  </p>

                  {/* Titre */}
                  <h3
                    style={{
                      fontFamily: "var(--font-marcellus), serif",
                      fontSize: estActive ? 20 : 18,
                      fontWeight: 400,
                      color: estActive ? "#FAF7F0" : "rgba(250,247,240,0.75)",
                      margin: "0 0 10px 0",
                      transition: reduitMotion ? "none" : "all 0.4s ease",
                      lineHeight: 1.3,
                    }}
                  >
                    {estDerniere && (
                      <span
                        style={{
                          display: "inline-block",
                          background: "#D4AF37",
                          color: "#0a2418",
                          fontSize: 10,
                          fontFamily: "var(--font-outfit), sans-serif",
                          fontWeight: 600,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          padding: "2px 8px",
                          borderRadius: 20,
                          marginBottom: 8,
                          verticalAlign: "middle",
                          marginRight: 10,
                        }}
                      >
                        Final
                      </span>
                    )}
                    {etape.titre}
                  </h3>

                  {/* Description */}
                  <p
                    style={{
                      fontFamily: "var(--font-outfit), sans-serif",
                      fontSize: 14,
                      color: estActive
                        ? "rgba(250,247,240,0.7)"
                        : "rgba(250,247,240,0.4)",
                      margin: 0,
                      lineHeight: 1.7,
                      transition: reduitMotion ? "none" : "color 0.4s ease",
                    }}
                  >
                    {etape.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── CTA ────────────────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginTop: 64 }}>
          <a
            href="/publier"
            style={{
              display: "inline-block",
              background: "#D4AF37",
              color: "#0a2418",
              fontFamily: "var(--font-outfit), sans-serif",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.06em",
              padding: "14px 36px",
              borderRadius: 50,
              textDecoration: "none",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Déposer mon bien
          </a>
          <p
            style={{
              fontFamily: "var(--font-outfit), sans-serif",
              fontSize: 13,
              color: "rgba(250,247,240,0.35)",
              marginTop: 14,
            }}
          >
            Gratuit et sans engagement
          </p>
        </div>

      </div>
    </section>
  );
}
