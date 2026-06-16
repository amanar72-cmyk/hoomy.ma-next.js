"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const VILLES = ["Casablanca", "Marrakech", "Rabat", "Tanger", "Agadir", "Fès"];
const TYPES = ["Appartement", "Villa", "Riad", "Bureau", "Terrain"];
const TENDANCES = ["Agadir", "Marrakech", "Casablanca", "Tanger"];

export default function HeroSection() {
  const [mode, setMode] = useState<"vente" | "location">("vente");
  const [ville, setVille] = useState("");
  const [type, setType] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const router = useRouter();

  function rechercher() {
    const params = new URLSearchParams();
    if (ville) params.set("ville", ville);
    if (type) params.set("type", type);
    if (budgetMin) params.set("prixMin", budgetMin);
    if (budgetMax) params.set("prixMax", budgetMax);
    const chemin = mode === "vente" ? "/acheter" : "/louer";
    router.push(`${chemin}?${params.toString()}`);
  }

  const selectStyle = {
    borderColor: "#E0DAC8",
    color: "#0F4C3A",
    background: "#fff",
  };

  return (
    <section
      className="relative px-6 py-20 text-center"
      style={{ background: "linear-gradient(135deg, #0F4C3A 0%, #1a6b4a 50%, #146C43 100%)" }}
    >
      <p className="text-xs tracking-widest mb-4" style={{ color: "#D4AF37", letterSpacing: "0.2em" }}>
        IMMOBILIER PREMIUM · MAROC
      </p>

      <h1
        className="text-4xl md:text-5xl font-normal mb-5 leading-tight"
        style={{ fontFamily: "var(--font-marcellus), serif", color: "#fff" }}
      >
        Trouvez le bien idéal<br />
        <span style={{ color: "#D4AF37", fontStyle: "italic" }}>au Maroc</span>
      </h1>

      <p className="text-base mb-10 max-w-xl mx-auto leading-relaxed" style={{ color: "#C9D5CF" }}>
        Des milliers d'annonces vérifiées — appartements, villas, riads et plus,
        dans toutes les grandes villes du Royaume.
      </p>

      {/* Barre de recherche */}
      <div
        className="rounded-2xl p-5 max-w-3xl mx-auto text-left"
        style={{ background: "#fff", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}
      >
        {/* Toggle Acheter / Louer */}
        <div className="inline-flex mb-5 rounded-full p-1" style={{ background: "#F2ECDD" }}>
          {(["vente", "location"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-6 py-2 rounded-full text-sm font-medium transition-all cursor-pointer"
              style={
                mode === m
                  ? { background: "#0F4C3A", color: "#fff" }
                  : { color: "#0F4C3A" }
              }
            >
              {m === "vente" ? "Acheter" : "Louer"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Ville */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "#888" }}>Ville</label>
            <select
              value={ville}
              onChange={(e) => setVille(e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none appearance-none cursor-pointer"
              style={selectStyle}
            >
              <option value="">Toutes les villes</option>
              {VILLES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "#888" }}>Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none appearance-none cursor-pointer"
              style={selectStyle}
            >
              <option value="">Tous les types</option>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Budget min */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "#888" }}>Budget min (DH)</label>
            <input
              type="number"
              placeholder="0"
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none"
              style={selectStyle}
            />
          </div>

          {/* Budget max */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "#888" }}>Budget max (DH)</label>
            <input
              type="number"
              placeholder="Sans limite"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none"
              style={selectStyle}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={rechercher}
            className="px-8 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 cursor-pointer"
            style={{ background: "#D4AF37", color: "#0F4C3A" }}
          >
            Rechercher
          </button>
        </div>
      </div>

      {/* Tags tendances */}
      <div className="mt-6 text-xs" style={{ color: "#9DB8AD" }}>
        Tendances :{" "}
        {TENDANCES.map((v, i) => (
          <span key={v}>
            <Link href={`/acheter?ville=${v}`} style={{ color: "#D4AF37", textDecoration: "none" }} className="hover:underline">
              {v}
            </Link>
            {i < TENDANCES.length - 1 && <span className="mx-1.5">·</span>}
          </span>
        ))}
      </div>
    </section>
  );
}
