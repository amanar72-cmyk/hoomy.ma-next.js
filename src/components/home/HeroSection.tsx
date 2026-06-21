"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import React from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Constantes ────────────────────────────────────────────────────────────────

type Mode = "acheter" | "louer" | "neuf" | "estimer";

const VILLES = ["Casablanca", "Marrakech", "Rabat", "Tanger", "Agadir", "Fès"] as const;
const TYPES_BIEN = ["Appartement", "Villa", "Riad", "Bureau", "Terrain"] as const;

const BUDGETS_VENTE = [
  { label: "Tout budget" },
  { label: "Jusqu'à 500 000 DH",       prixMax: 500_000 },
  { label: "500 000 – 1 000 000 DH",   prixMin: 500_000,   prixMax: 1_000_000 },
  { label: "1 000 000 – 2 000 000 DH", prixMin: 1_000_000, prixMax: 2_000_000 },
  { label: "2 000 000 – 5 000 000 DH", prixMin: 2_000_000, prixMax: 5_000_000 },
  { label: "5 000 000 DH et plus",     prixMin: 5_000_000 },
] as const;

const BUDGETS_LOCATION = [
  { label: "Tout budget" },
  { label: "Jusqu'à 3 000 DH/mois",    prixMax: 3_000 },
  { label: "3 000 – 6 000 DH/mois",    prixMin: 3_000,  prixMax: 6_000 },
  { label: "6 000 – 12 000 DH/mois",   prixMin: 6_000,  prixMax: 12_000 },
  { label: "12 000 – 25 000 DH/mois",  prixMin: 12_000, prixMax: 25_000 },
  { label: "25 000 DH/mois et plus",   prixMin: 25_000 },
] as const;

const TENDANCES = [
  { label: "Guéliz · Marrakech",  href: "/acheter?ville=Marrakech&quartier=Gu%C3%A9liz" },
  { label: "Maarif · Casablanca", href: "/acheter?ville=Casablanca&quartier=Maarif" },
  { label: "Agdal · Rabat",       href: "/acheter?ville=Rabat&quartier=Agdal" },
  { label: "Malabata · Tanger",   href: "/acheter?ville=Tanger&quartier=Malabata" },
  { label: "Hay Riad · Rabat",    href: "/acheter?ville=Rabat&quartier=Hay%20Riad" },
  { label: "Agadir ville",        href: "/acheter?ville=Agadir" },
] as const;

// ─── Icônes SVG inline ─────────────────────────────────────────────────────────

function IcMaison() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}

function IcCle() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5"/>
      <path d="M21.5 2.5l-9.5 9.5"/>
      <path d="M15.5 2.5l3 3"/>
      <path d="M18.5 5.5l3 3"/>
    </svg>
  );
}

function IcImmeuble() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="1"/>
      <path d="M9 22v-9h6v9"/>
      <path d="M8 8h.01M12 8h.01M16 8h.01"/>
      <path d="M8 12h.01M16 12h.01"/>
    </svg>
  );
}

function IcGraphique() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2 20 22 20"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="18" y1="20" x2="18" y2="10"/>
    </svg>
  );
}

const MODES: { id: Mode; label: string; desc: string; Icone: () => React.ReactElement }[] = [
  { id: "acheter", label: "Acheter",  desc: "Appartements, villas, riads…",    Icone: IcMaison },
  { id: "louer",   label: "Louer",    desc: "Location longue ou courte durée", Icone: IcCle },
  { id: "neuf",    label: "Neuf",     desc: "Programmes immobiliers neufs",    Icone: IcImmeuble },
  { id: "estimer", label: "Estimer",  desc: "Connaître la valeur de votre bien", Icone: IcGraphique },
];

// ─── Composant principal ───────────────────────────────────────────────────────

export default function HeroSection() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("acheter");
  const [ville, setVille] = useState("");
  const [quartier, setQuartier] = useState("");
  const [type, setType] = useState("");
  const [budgetIdx, setBudgetIdx] = useState(0);
  const [quartiers, setQuartiers] = useState<string[]>([]);
  const [chargeQ, setChargeQ] = useState(false);

  // ── Cascade ville → quartiers ────────────────────────────────────────────────
  useEffect(() => {
    if (!ville) {
      setQuartiers([]);
      setQuartier("");
      return;
    }
    let annule = false;
    setChargeQ(true);
    setQuartier("");

    async function charger() {
      const supabase = createClient();
      const [{ data: dQ }, { data: dB }] = await Promise.all([
        supabase.from("quartiers").select("nom").eq("ville", ville).order("nom"),
        supabase.from("biens").select("quartier").eq("ville", ville).not("quartier", "is", null),
      ]);
      if (annule) return;
      const deQ = (dQ ?? []).map((r: { nom: string }) => r.nom);
      const deB = [...new Set((dB ?? []).map((r: { quartier: string }) => r.quartier).filter(Boolean))];
      const fusionnes = [...new Set([...deQ, ...deB])].sort((a, b) =>
        a.localeCompare(b, "fr", { sensitivity: "base" })
      );
      setQuartiers(fusionnes);
      setChargeQ(false);
    }
    void charger();
    return () => { annule = true; };
  }, [ville]);

  // ── Changement de mode ────────────────────────────────────────────────────────
  function changerMode(m: Mode) {
    setMode(m);
    setBudgetIdx(0);
    if (m === "estimer") router.push("/estimer");
  }

  // ── Soumission de la recherche ────────────────────────────────────────────────
  function chercher(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (ville) params.set("ville", ville);
    if (quartier) params.set("quartier", quartier);
    if (type) params.set("type", type);

    const budgets = mode === "louer" ? BUDGETS_LOCATION : BUDGETS_VENTE;
    const b = budgets[budgetIdx] as { label: string; prixMin?: number; prixMax?: number };
    if (b.prixMin) params.set("prixMin", String(b.prixMin));
    if (b.prixMax) params.set("prixMax", String(b.prixMax));

    router.push(`/${mode === "louer" ? "louer" : "acheter"}?${params.toString()}`);
  }

  const budgets = mode === "louer" ? BUDGETS_LOCATION : BUDGETS_VENTE;

  const selectCls =
    "w-full border rounded-xl px-3 py-2.5 text-sm appearance-none focus:outline-none cursor-pointer";
  const selectStyle: React.CSSProperties = {
    borderColor: "var(--bordure)",
    color: "var(--texte-corps)",
    background: "var(--fond-secondaire)",
  };

  return (
    <section
      className="px-4 py-12 md:py-16"
      style={{
        background:
          "linear-gradient(145deg, #0A3528 0%, #0F4C3A 40%, #146C43 80%, #1a6b4a 100%)",
      }}
    >
      <div className="max-w-4xl mx-auto text-center">

        {/* ── Tagline ─────────────────────────────────────────────────────── */}
        <p
          className="text-xs tracking-widest mb-4"
          style={{ color: "var(--accent)", letterSpacing: "0.22em" }}
        >
          IMMOBILIER PREMIUM · MAROC
        </p>

        {/* ── Titre ───────────────────────────────────────────────────────── */}
        <h1
          className="text-3xl md:text-5xl font-normal mb-3 leading-tight"
          style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--fond-secondaire)" }}
        >
          Trouvez votre prochain bien<br />
          <span style={{ color: "var(--accent)", fontStyle: "italic" }}>au Maroc</span>
        </h1>
        <p className="text-sm mb-8" style={{ color: "#C9D5CF" }}>
          Des milliers d'annonces vérifiées dans toutes les grandes villes du Royaume.
        </p>

        {/* ── 4 cartes d'intention ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {MODES.map(({ id, label, desc, Icone }) => {
            const actif = mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => changerMode(id)}
                className="flex flex-col items-center justify-center py-5 px-3 rounded-2xl cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                style={
                  actif
                    ? {
                        background: "rgba(212,175,55,0.13)",
                        border: "1.5px solid rgba(212,175,55,0.65)",
                        boxShadow:
                          "0 0 20px rgba(212,175,55,0.18), 0 4px 16px rgba(0,0,0,0.15)",
                      }
                    : {
                        background: "rgba(255,255,255,0.065)",
                        border: "1px solid rgba(255,255,255,0.13)",
                      }
                }
              >
                <span style={{ color: actif ? "var(--accent)" : "rgba(255,255,255,0.65)" }}>
                  <Icone />
                </span>
                <span
                  className="text-sm font-semibold mt-2.5"
                  style={{ color: actif ? "var(--accent)" : "rgba(255,255,255,0.9)" }}
                >
                  {label}
                </span>
                <span
                  className="text-xs mt-0.5 hidden md:block"
                  style={{
                    color: actif ? "rgba(212,175,55,0.75)" : "rgba(255,255,255,0.38)",
                  }}
                >
                  {desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Formulaire de recherche ─────────────────────────────────────── */}
        {mode !== "estimer" ? (
          <form
            onSubmit={chercher}
            className="rounded-2xl p-4 md:p-5 text-left"
            style={{
              background: "var(--fond-secondaire)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">

              {/* Ville */}
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                  style={{ color: "var(--texte-tertiaire)" }}
                >
                  Ville
                </label>
                <select
                  value={ville}
                  onChange={(e) => setVille(e.target.value)}
                  className={selectCls}
                  style={selectStyle}
                >
                  <option value="">Toutes les villes</option>
                  {VILLES.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Secteur — dépend de la ville */}
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                  style={{ color: "var(--texte-tertiaire)" }}
                >
                  Secteur
                </label>
                <select
                  value={quartier}
                  onChange={(e) => setQuartier(e.target.value)}
                  disabled={!ville || chargeQ}
                  className={`${selectCls} disabled:opacity-45 disabled:cursor-not-allowed`}
                  style={selectStyle}
                >
                  <option value="">
                    {!ville
                      ? "Choisissez d'abord une ville"
                      : chargeQ
                      ? "Chargement…"
                      : "Tous les secteurs"}
                  </option>
                  {quartiers.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>

              {/* Type de bien */}
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                  style={{ color: "var(--texte-tertiaire)" }}
                >
                  Type de bien
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className={selectCls}
                  style={selectStyle}
                >
                  <option value="">Tous les types</option>
                  {TYPES_BIEN.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Budget */}
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                  style={{ color: "var(--texte-tertiaire)" }}
                >
                  Budget
                </label>
                <select
                  value={budgetIdx}
                  onChange={(e) => setBudgetIdx(Number(e.target.value))}
                  className={selectCls}
                  style={selectStyle}
                >
                  {budgets.map((b, i) => (
                    <option key={i} value={i}>{b.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bouton soumettre */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 cursor-pointer"
              style={{ background: "var(--accent)", color: "var(--primaire)" }}
            >
              {mode === "neuf" ? "Voir les biens neufs" : "Voir les biens"}
            </button>
          </form>
        ) : (
          /* CTA Estimer */
          <div
            className="rounded-2xl p-8 text-center"
            style={{
              background: "rgba(255,255,255,0.065)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <p
              className="text-sm mb-5 leading-relaxed"
              style={{ color: "rgba(255,255,255,0.8)" }}
            >
              Estimez la valeur de votre bien immobilier en quelques minutes grâce à notre
              algorithme basé sur les données du marché marocain.
            </p>
            <Link
              href="/estimer"
              className="inline-block px-8 py-3.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
              style={{
                background: "var(--accent)",
                color: "var(--primaire)",
                textDecoration: "none",
              }}
            >
              Lancer l'estimation →
            </Link>
          </div>
        )}

        {/* ── Tags tendances ──────────────────────────────────────────────── */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            Tendances :
          </span>
          {TENDANCES.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="text-xs px-3 py-1.5 rounded-full transition-all hover:-translate-y-px hover:opacity-90"
              style={{
                background: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.72)",
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              {t.label}
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}
