"use client";

// Vitrine animée de la place de marché inversée (page d'accueil).
// Compteur qui s'anime au scroll, cartes en éventail avec bascule 3D au
// survol de la souris (framer-motion, GPU), fil d'étapes en cascade.
// Entièrement neutralisé sous prefers-reduced-motion.

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { RevealCascade, RevealItem } from "@/components/ui/Reveal";
import { LIBELLE_TRANSACTION, formaterFourchetteBudget, type DemandePublique, type TransactionRecherche } from "@/lib/demandes/types";

type CarteDemande = Pick<DemandePublique, "reference" | "transaction" | "type_bien" | "ville" | "budget_min" | "budget_max" | "quartiers">;

// Cartes illustratives — affichées uniquement tant qu'aucune demande réelle
// n'est publiée, clairement marquées "Exemple" (jamais présentées comme réelles).
const EXEMPLES: CarteDemande[] = [
  { reference: "HD-XXXXX", transaction: "achat", type_bien: "Villa", ville: "Marrakech", budget_min: 2500000, budget_max: 3200000, quartiers: ["Palmeraie"] },
  { reference: "HD-XXXXX", transaction: "location", type_bien: "Appartement", ville: "Casablanca", budget_min: 7000, budget_max: 9500, quartiers: ["Gauthier"] },
  { reference: "HD-XXXXX", transaction: "achat", type_bien: "Riad", ville: "Fès", budget_min: 1200000, budget_max: 1800000, quartiers: ["Médina"] },
];

const ETAPES = [
  { titre: "Le client publie sa recherche", texte: "Anonymement — budget, ville, critères. Aucune coordonnée n'est jamais rendue publique." },
  { titre: "Vous consultez les critères", texte: "Parcourez les demandes actives à la recherche d'une correspondance avec votre portefeuille." },
  { titre: "Vous proposez votre bien", texte: "En un formulaire, sans compte. Nous transmettons votre proposition en interne." },
] as const;

// ── Compteur animé (count-up déclenché à l'entrée dans le viewport) ─────────
function useCompteur(cible: number) {
  const [valeur, setValeur] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const reduit = useReducedMotion();

  useEffect(() => {
    if (reduit) {
      const raf = requestAnimationFrame(() => setValeur(cible));
      return () => cancelAnimationFrame(raf);
    }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entrees) => {
        if (!entrees[0].isIntersecting) return;
        obs.disconnect();
        const duree = 1300;
        const debut = performance.now();
        let raf: number;
        const tick = (t: number) => {
          const p = Math.min(1, (t - debut) / duree);
          const ease = 1 - Math.pow(1 - p, 3);
          setValeur(Math.round(cible * ease));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [cible, reduit]);

  return { valeur, ref };
}

// ── Carte avec bascule 3D au survol de la souris ─────────────────────────────
function CarteTilt({ children, decalage }: { children: ReactNode; decalage: number }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-40, 40], [7, -7]), { stiffness: 240, damping: 22 });
  const rotateY = useSpring(useTransform(x, [-40, 40], [-7, 7]), { stiffness: 240, damping: 22 });

  function gererMouvement(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - r.left - r.width / 2);
    y.set(e.clientY - r.top - r.height / 2);
  }
  function reinitialiser() {
    x.set(0);
    y.set(0);
  }

  return (
    <RevealItem>
      <motion.div
        onMouseMove={gererMouvement}
        onMouseLeave={reinitialiser}
        style={{ rotateX, rotateY, transformPerspective: 900, marginTop: decalage }}
        whileHover={{ scale: 1.03 }}
        transition={{ type: "spring", stiffness: 240, damping: 22 }}
        className="rounded-2xl p-5"
      >
        {children}
      </motion.div>
    </RevealItem>
  );
}

function BadgeTransaction({ transaction }: { transaction: TransactionRecherche }) {
  return (
    <span
      className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
      style={
        transaction === "location"
          ? { background: "rgba(212,175,55,0.18)", color: "#E9C766" }
          : { background: "rgba(255,255,255,0.14)", color: "#fff" }
      }
    >
      {LIBELLE_TRANSACTION[transaction]}
    </span>
  );
}

export default function VitrineDemandesAnimee({ nbDemandes, demandes }: { nbDemandes: number; demandes: DemandePublique[] }) {
  const reel = demandes.length > 0;
  const cartes: CarteDemande[] = reel ? demandes.slice(0, 3) : EXEMPLES;
  const { valeur, ref } = useCompteur(nbDemandes);

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "linear-gradient(145deg, #0A3528 0%, #0F4C3A 55%, #146C43 100%)" }}
    >
      {/* Halo doré animé — respiration lente, purement décorative */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none motion-safe:animate-pulse"
        style={{
          top: "-15%",
          right: "-10%",
          width: 480,
          height: 480,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212,175,55,0.16) 0%, transparent 70%)",
          animationDuration: "5s",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* ── Colonne gauche : discours + compteur + CTA ── */}
          <div>
            <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: "var(--accent)", letterSpacing: "0.16em" }}>
              Place de marché HOOMY
            </p>
            <h2 className="text-3xl md:text-4xl font-normal mb-4" style={{ fontFamily: "var(--font-marcellus), serif", color: "#fff" }}>
              Vos clients vous attendent
            </h2>
            <p className="text-sm leading-relaxed mb-7" style={{ color: "#C9D5CF", maxWidth: 440 }}>
              Des acheteurs et locataires publient anonymement ce qu&apos;ils recherchent. Consultez
              leurs critères et proposez le bien qui correspond — sans attendre qu&apos;ils tombent
              sur votre annonce.
            </p>

            {reel && (
              <div className="flex items-center gap-2.5 mb-8">
                <span
                  className="inline-block w-2 h-2 rounded-full motion-safe:animate-pulse"
                  style={{ background: "#4ADE80" }}
                />
                <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-marcellus), serif", color: "#fff" }}>
                  <span ref={ref}>{valeur}</span>
                  <span className="text-sm font-normal ml-2" style={{ color: "#9DB8AD" }}>
                    demande{nbDemandes > 1 ? "s" : ""} publiée{nbDemandes > 1 ? "s" : ""} en ce moment
                  </span>
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/demandes?transaction=achat"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold transition-transform hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg, #E9C766, var(--accent))", color: "#0F4C3A", textDecoration: "none", boxShadow: "0 4px 16px rgba(212,175,55,0.3)" }}
              >
                Demandes d&apos;achat
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <Link
                href="/demandes?transaction=location"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ border: "1.5px solid rgba(255,255,255,0.35)", color: "#fff", textDecoration: "none" }}
              >
                Demandes de location
              </Link>
            </div>
          </div>

          {/* ── Colonne droite : cartes en éventail, bascule 3D au survol ── */}
          <RevealCascade className="relative grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-3">
            {cartes.map((d, i) => {
              const budget = formaterFourchetteBudget(d.budget_min, d.budget_max);
              return (
                <CarteTilt key={`${d.reference}-${i}`} decalage={i === 1 ? -18 : 0}>
                  <div
                    className="rounded-2xl p-5 h-full flex flex-col gap-2.5"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", backdropFilter: "blur(6px)" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono" style={{ color: "#8FA69C" }}>{d.reference}</span>
                      <BadgeTransaction transaction={d.transaction} />
                    </div>
                    <p className="text-base font-semibold" style={{ fontFamily: "var(--font-marcellus), serif", color: "#fff" }}>
                      {d.type_bien ?? "Bien"} — {d.ville}
                    </p>
                    {d.quartiers && d.quartiers.length > 0 && (
                      <p className="text-xs" style={{ color: "#9DB8AD" }}>{d.quartiers.join(", ")}</p>
                    )}
                    {budget && <p className="text-sm font-medium mt-auto" style={{ color: "#E9C766" }}>{budget}</p>}
                    {!reel && (
                      <span className="text-[10px] font-semibold tracking-wide uppercase self-start px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)", color: "#C9D5CF" }}>
                        Exemple
                      </span>
                    )}
                  </div>
                </CarteTilt>
              );
            })}
          </RevealCascade>
        </div>

        {/* ── Trois étapes ── */}
        <RevealCascade className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 pt-12" >
          <div className="sm:col-span-3" style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }} />
          {ETAPES.map((etape, i) => (
            <RevealItem key={etape.titre}>
              <div className="flex items-start gap-3">
                <span
                  className="flex items-center justify-center rounded-full text-sm font-semibold flex-shrink-0"
                  style={{ width: 32, height: 32, background: "rgba(212,175,55,0.16)", color: "#E9C766", border: "1px solid rgba(212,175,55,0.4)" }}
                >
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: "#fff" }}>{etape.titre}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "#9DB8AD" }}>{etape.texte}</p>
                </div>
              </div>
            </RevealItem>
          ))}
        </RevealCascade>
      </div>
    </section>
  );
}
