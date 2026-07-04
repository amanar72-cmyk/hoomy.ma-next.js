"use client";

import { useState, useEffect, useRef } from "react";
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

function IcLocalisation() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
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

  // ── État partagé mobile + desktop ──────────────────────────────────────────
  const [mode, setMode]                     = useState<Mode>("acheter");
  const [ville, setVille]                   = useState("");
  const [quartiersChoisis, setQuartiersChoisis] = useState<string[]>([]);
  const [dropdownOuvert, setDropdownOuvert] = useState(false);
  const [type, setType]                     = useState("");
  const [budgetIdx, setBudgetIdx]           = useState(0);
  const [quartiers, setQuartiers]           = useState<string[]>([]);
  const [chargeQ, setChargeQ]               = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── État propre à la version mobile ────────────────────────────────────────
  const [filtresMobileOuverts, setFiltresMobileOuverts] = useState(false);
  const [chambresMin, setChambresMin]                   = useState(0);

  // ── Cascade ville → quartiers ────────────────────────────────────────────────
  useEffect(() => {
    if (!ville) {
      setQuartiers([]);
      setQuartiersChoisis([]);
      setDropdownOuvert(false);
      return;
    }
    let annule = false;
    setChargeQ(true);
    setQuartiersChoisis([]);
    setDropdownOuvert(false);

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

  // ── Fermer le dropdown secteur sur clic extérieur ─────────────────────────
  useEffect(() => {
    if (!dropdownOuvert) return;
    function fermer(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOuvert(false);
      }
    }
    document.addEventListener("mousedown", fermer);
    return () => document.removeEventListener("mousedown", fermer);
  }, [dropdownOuvert]);

  // ── Toggle quartier dans la sélection ────────────────────────────────────────
  function toggleQuartier(q: string) {
    setQuartiersChoisis((prev) =>
      prev.includes(q) ? prev.filter((x) => x !== q) : [...prev, q]
    );
  }

  // ── Changement de mode ────────────────────────────────────────────────────────
  function changerMode(m: Mode) {
    setMode(m);
    setBudgetIdx(0);
    if (m === "estimer") router.push("/estimer");
  }

  // ── Soumission de la recherche (mobile + desktop partagent cette fonction) ────
  function chercher(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (ville) params.set("ville", ville);
    if (quartiersChoisis.length > 0) params.set("quartier", quartiersChoisis.join(","));
    if (type) params.set("type", type);
    if (chambresMin > 0) params.set("chambresMin", String(chambresMin));

    const budgets = mode === "louer" ? BUDGETS_LOCATION : BUDGETS_VENTE;
    const b = budgets[budgetIdx] as { label: string; prixMin?: number; prixMax?: number };
    if (b.prixMin) params.set("prixMin", String(b.prixMin));
    if (b.prixMax) params.set("prixMax", String(b.prixMax));

    router.push(`/${mode === "louer" ? "louer" : "acheter"}?${params.toString()}`);
  }

  const budgets = mode === "louer" ? BUDGETS_LOCATION : BUDGETS_VENTE;

  // Classes/styles réutilisés pour les selects desktop
  const selectCls =
    "w-full border rounded-xl px-3 py-2.5 text-sm appearance-none focus:outline-none cursor-pointer";
  const selectStyle: React.CSSProperties = {
    borderColor: "var(--bordure)",
    color: "var(--texte-corps)",
    background: "var(--fond-secondaire)",
  };

  // Mode actif simplifié pour les onglets mobiles (Acheter / Louer uniquement)
  const modeActifMobile: "acheter" | "louer" = mode === "louer" ? "louer" : "acheter";

  // Nombre de filtres actifs dans le panneau mobile (pour l'indicateur)
  const nbFiltresActifs = (type ? 1 : 0) + (budgetIdx > 0 ? 1 : 0) + (chambresMin > 0 ? 1 : 0);

  // Styles boutons toggle (type de bien, chambres)
  function styleBtnToggle(actif: boolean): React.CSSProperties {
    return actif
      ? { background: "var(--primaire)", color: "var(--fond-secondaire)", border: "1.5px solid var(--primaire)" }
      : { background: "transparent", color: "var(--texte-corps)", border: "1.5px solid var(--bordure)" };
  }

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
          Biens vérifiés dans toutes les grandes villes du Royaume.
        </p>

        {/* ══════════════════════════════════════════════════════════════════
            4 cartes d'intention — DESKTOP uniquement (hidden en mobile)
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="hidden md:grid md:grid-cols-4 gap-3 mb-5">
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
                        boxShadow: "0 0 20px rgba(212,175,55,0.18), 0 4px 16px rgba(0,0,0,0.15)",
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
                  className="text-xs mt-0.5"
                  style={{ color: actif ? "rgba(212,175,55,0.75)" : "rgba(255,255,255,0.38)" }}
                >
                  {desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            2 onglets Acheter / Louer — MOBILE uniquement (md:hidden)
        ═══════════════════════════════════════════════════════════════════ */}
        <div
          className="flex md:hidden mb-4 p-1 gap-1 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.1)" }}
        >
          {(["acheter", "louer"] as const).map((m) => {
            const actif = modeActifMobile === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => changerMode(m)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                style={
                  actif
                    ? { background: "#D4AF37", color: "#0F4C3A" }
                    : { background: "transparent", color: "rgba(255,255,255,0.78)" }
                }
              >
                {m === "acheter" ? "Acheter" : "Louer"}
              </button>
            );
          })}
        </div>

        {/* ── Formulaire de recherche ─────────────────────────────────────── */}
        {/* key={mode} : le panneau remonte à chaque bascule → crossfade CSS doux
            (hero-crossfade), sans toucher le LCP (déclenché uniquement au clic). */}
        {mode !== "estimer" ? (
          <form
            key={mode}
            onSubmit={chercher}
            className="rounded-2xl p-4 md:p-5 text-left hero-crossfade"
            style={{
              background: "var(--fond-secondaire)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
            }}
          >

            {/* ══════════════════════════════════════════════════════════════
                VERSION MOBILE — champ unique + filtres dépliables
                (masquée sur md+)
            ═════════════════════════════════════════════════════════════ */}
            <div className="md:hidden">

              {/* Champ principal : Ville */}
              <div className="relative mb-3">
                <span
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--primaire)" }}
                >
                  <IcLocalisation />
                </span>
                <select
                  value={ville}
                  onChange={(e) => setVille(e.target.value)}
                  className="w-full border rounded-xl appearance-none focus:outline-none cursor-pointer"
                  style={{
                    paddingLeft: 40,
                    paddingRight: 16,
                    paddingTop: 16,
                    paddingBottom: 16,
                    fontSize: 15,
                    borderColor: "var(--bordure)",
                    color: ville ? "var(--texte-corps)" : "var(--texte-tertiaire)",
                    background: "var(--fond-secondaire)",
                    fontFamily: "var(--font-outfit), sans-serif",
                  }}
                >
                  <option value="">Ville, quartier...</option>
                  {VILLES.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Bouton Rechercher */}
              <button
                type="submit"
                className="w-full rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                style={{
                  paddingTop: 16,
                  paddingBottom: 16,
                  background: "#D4AF37",
                  color: "#0F4C3A",
                  marginBottom: 10,
                  fontFamily: "var(--font-outfit), sans-serif",
                }}
              >
                Rechercher
              </button>

              {/* Bouton + Filtres */}
              <button
                type="button"
                onClick={() => setFiltresMobileOuverts((o) => !o)}
                className="w-full py-2 text-xs text-center transition-opacity hover:opacity-80"
                style={{
                  color: "var(--texte-tertiaire)",
                  letterSpacing: "0.04em",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {filtresMobileOuverts
                  ? "✕ Fermer les filtres"
                  : nbFiltresActifs > 0
                  ? `+ Filtres · ${nbFiltresActifs} actif${nbFiltresActifs > 1 ? "s" : ""}`
                  : "+ Filtres  —  type · budget · pièces"}
              </button>

              {/* Panneau de filtres dépliable */}
              <div
                style={{
                  maxHeight: filtresMobileOuverts ? 580 : 0,
                  overflow: "hidden",
                  transition: "max-height 0.38s cubic-bezier(0.4,0,0.2,1)",
                }}
              >
                <div
                  className="space-y-5 pt-4 mt-3"
                  style={{ borderTop: "1px solid var(--bordure)" }}
                >

                  {/* Type de bien */}
                  <div>
                    <p
                      className="text-xs uppercase font-semibold mb-2.5 tracking-wide"
                      style={{ color: "var(--texte-tertiaire)" }}
                    >
                      Type de bien
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "Tous", value: "" },
                        ...TYPES_BIEN.map((t) => ({ label: t, value: t })),
                      ].map(({ label, value }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setType(value)}
                          className="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all"
                          style={styleBtnToggle(type === value)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Budget */}
                  <div>
                    <p
                      className="text-xs uppercase font-semibold mb-2.5 tracking-wide"
                      style={{ color: "var(--texte-tertiaire)" }}
                    >
                      Budget
                    </p>
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

                  {/* Chambres */}
                  <div>
                    <p
                      className="text-xs uppercase font-semibold mb-2.5 tracking-wide"
                      style={{ color: "var(--texte-tertiaire)" }}
                    >
                      Chambres
                    </p>
                    <div className="flex gap-2">
                      {[
                        { label: "Toutes", value: 0 },
                        { label: "1+",     value: 1 },
                        { label: "2+",     value: 2 },
                        { label: "3+",     value: 3 },
                        { label: "4+",     value: 4 },
                      ].map(({ label, value }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setChambresMin(value)}
                          className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                          style={styleBtnToggle(chambresMin === value)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bouton "Voir les biens" depuis les filtres */}
                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                    style={{ background: "var(--primaire)", color: "var(--fond-secondaire)" }}
                  >
                    Voir les biens
                  </button>
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                VERSION DESKTOP — 4 champs en grille (inchangée)
                (masquée sur mobile)
            ═════════════════════════════════════════════════════════════ */}
            <div className="hidden md:block">
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

                {/* Secteur — multi-sélection avec dropdown */}
                <div ref={dropdownRef} className="relative">
                  <label
                    className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                    style={{ color: "var(--texte-tertiaire)" }}
                  >
                    Secteur
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (ville && !chargeQ && quartiers.length > 0) {
                        setDropdownOuvert((o) => !o);
                      }
                    }}
                    disabled={!ville || chargeQ}
                    className={`${selectCls} disabled:opacity-45 disabled:cursor-not-allowed flex items-center justify-between gap-1`}
                    style={selectStyle}
                  >
                    <span className="truncate text-left">
                      {!ville
                        ? "Choisissez d'abord une ville"
                        : chargeQ
                        ? "Chargement…"
                        : quartiers.length === 0
                        ? "Aucun secteur"
                        : quartiersChoisis.length === 0
                        ? "Tous les secteurs"
                        : quartiersChoisis.length === 1
                        ? quartiersChoisis[0]
                        : `${quartiersChoisis.length} secteurs`}
                    </span>
                    <svg
                      width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" className="flex-shrink-0"
                      style={{ transform: dropdownOuvert ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {/* Dropdown avec checkboxes */}
                  {dropdownOuvert && quartiers.length > 0 && (
                    <div
                      className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl overflow-hidden"
                      style={{
                        background: "var(--fond-secondaire)",
                        border: "1px solid var(--bordure)",
                        boxShadow: "0 8px 28px rgba(0,0,0,0.14)",
                        maxHeight: 228,
                        overflowY: "auto",
                      }}
                    >
                      {quartiersChoisis.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setQuartiersChoisis([])}
                          className="w-full text-left px-3 py-2 text-xs font-semibold"
                          style={{
                            color: "var(--primaire-clair)",
                            borderBottom: "1px solid var(--bordure-legere)",
                            background: "var(--fond-accent)",
                          }}
                        >
                          ✕ Effacer la sélection ({quartiersChoisis.length})
                        </button>
                      )}
                      {quartiers.map((q) => {
                        const coche = quartiersChoisis.includes(q);
                        return (
                          <label
                            key={q}
                            className="flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors"
                            style={{ background: coche ? "var(--fond-vert-leger)" : undefined }}
                            onMouseEnter={(e) => {
                              if (!coche) (e.currentTarget as HTMLLabelElement).style.background = "var(--fond-accent)";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLLabelElement).style.background = coche ? "var(--fond-vert-leger)" : "";
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={coche}
                              onChange={() => toggleQuartier(q)}
                              className="w-3.5 h-3.5 rounded cursor-pointer"
                              style={{ accentColor: "var(--primaire)" }}
                            />
                            <span className="text-sm leading-none" style={{ color: "var(--texte-corps)" }}>
                              {q}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
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

              {/* Bouton soumettre desktop */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 cursor-pointer"
                style={{ background: "var(--accent)", color: "var(--primaire)" }}
              >
                {mode === "neuf" ? "Voir les biens neufs" : "Voir les biens"}
              </button>
            </div>

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
