"use client";

import Link from "next/link";

const CATEGORIES = [
  {
    id: "acheter",
    label: "Acheter",
    sous: "Appartements, villas, riads…",
    icone: "🏠",
    gradient: "linear-gradient(140deg, #0A3528 0%, #0F4C3A 55%, #146C43 100%)",
    accentBorder: true,
  },
  {
    id: "louer",
    label: "Louer",
    sous: "Location longue ou courte durée",
    icone: "🔑",
    gradient: "linear-gradient(140deg, #0D3B5E 0%, #1A5276 55%, #2471A3 100%)",
    accentBorder: false,
  },
  {
    id: "neuf",
    label: "Neuf",
    sous: "Programmes immobiliers neufs",
    icone: "🏗️",
    gradient: "linear-gradient(140deg, #4A235A 0%, #6C3483 55%, #7D3C98 100%)",
    accentBorder: false,
  },
  {
    id: "estimer",
    label: "Estimer",
    sous: "Connaître la valeur de votre bien",
    icone: "📊",
    gradient: "linear-gradient(140deg, #6E2F1A 0%, #A04000 55%, #BA4A00 100%)",
    accentBorder: false,
  },
] as const;

export default function CategoryCards() {
  return (
    /* -mt-20 : chevauche le bas du hero ; z-20 : passe devant le hero */
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto px-4 -mt-20 relative z-20">
      {CATEGORIES.map((cat) => (
        <Link
          key={cat.id}
          href={`/${cat.id}`}
          className="group relative h-40 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
          style={{ textDecoration: "none" }}
        >
          {/* Dégradé de fond */}
          <div
            className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-95"
            style={{ background: cat.gradient, opacity: 0.96 }}
          />

          {/* Motif de texture subtil */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 80% 20%, #D4AF37 0%, transparent 55%)",
            }}
          />

          {/* Contenu */}
          <div className="relative h-full flex flex-col items-center justify-center text-white p-4 gap-1">
            <span className="text-4xl leading-none mb-1">{cat.icone}</span>
            <h3
              className="text-lg font-normal leading-tight"
              style={{ fontFamily: "var(--font-marcellus), serif" }}
            >
              {cat.label}
            </h3>
            <p className="text-xs text-center leading-snug" style={{ color: "rgba(255,255,255,0.78)" }}>
              {cat.sous}
            </p>
          </div>

          {/* Bordure dorée sur la carte "Acheter" */}
          {cat.accentBorder && (
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{ border: "2px solid #D4AF37" }}
            />
          )}
        </Link>
      ))}
    </div>
  );
}
