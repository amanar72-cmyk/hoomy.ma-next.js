"use client";

import { useState } from "react";
import Link from "next/link";
import type { Bien } from "@/lib/types";

function cheminBien(bien: Bien) {
  const action = bien.transaction === "location" ? "louer" : "acheter";
  return `/${action}/${bien.slug ?? bien.id}`;
}

function formatPrix(prix: number, transaction: string) {
  return `${prix.toLocaleString("fr-FR")} DH${transaction === "location" ? "/mois" : ""}`;
}

function IconCoeur({ plein }: { plein: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={plein ? "var(--accent)" : "none"} stroke={plein ? "var(--accent)" : "#999"} strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function IconMaison() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#C2BBA3" strokeWidth="1.4">
      <path d="M3 11L12 4l9 7M5 9.5V20h14V9.5" />
    </svg>
  );
}

export default function BiensVedette({ biens }: { biens: Bien[] }) {
  const [favoris, setFavoris] = useState<Set<string>>(new Set());

  function toggleFavori(e: React.MouseEvent, id: string) {
    e.preventDefault();
    setFavoris((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <div className="flex items-baseline justify-between mb-8">
        <h2
          className="text-3xl font-normal"
          style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}
        >
          Biens en vedette
        </h2>
        <Link href="/acheter" className="text-sm hover:underline" style={{ color: "var(--primaire-clair)", textDecoration: "none" }}>
          Voir tous les biens →
        </Link>
      </div>

      {biens.length === 0 ? (
        <p className="text-center py-16 text-sm" style={{ color: "#999" }}>
          Aucun bien disponible pour le moment.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {biens.map((bien) => (
            <div
              key={bien.id}
              className="rounded-2xl overflow-hidden border transition-shadow hover:shadow-lg"
              style={{ background: "var(--fond-secondaire)", borderColor: "#E8E2D2" }}
            >
              {/* Photo — Link séparé du bouton favori pour éviter button dans anchor */}
              <div className="relative h-48 overflow-hidden" style={{ background: "var(--bordure)" }}>
                <Link href={cheminBien(bien)} className="block h-full" style={{ textDecoration: "none" }}>
                  {bien.photos?.[0] ? (
                    <img
                      src={bien.photos[0]}
                      alt={bien.titre}
                      className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <IconMaison />
                    </div>
                  )}
                </Link>

                {/* Badge vérifié */}
                {bien.verifie && (
                  <span
                    className="absolute top-3 left-3 text-xs px-2.5 py-1 rounded border"
                    style={{ background: "var(--fond-secondaire)", color: "var(--primaire)", borderColor: "var(--accent)" }}
                  >
                    ✓ Vérifié
                  </span>
                )}

                {/* Badge transaction */}
                <span
                  className="absolute top-3 right-12 text-xs px-2.5 py-1 rounded"
                  style={
                    bien.transaction === "location"
                      ? { background: "var(--accent)", color: "var(--primaire)" }
                      : { background: "var(--primaire-clair)", color: "var(--fond-secondaire)" }
                  }
                >
                  {bien.transaction === "location" ? "À louer" : "À vendre"}
                </span>

                {/* Bouton favori — en dehors du Link pour éviter button > a */}
                <button
                  onClick={(e) => toggleFavori(e, bien.id)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow transition-transform hover:scale-110 cursor-pointer"
                  aria-label={favoris.has(bien.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                >
                  <IconCoeur plein={favoris.has(bien.id)} />
                </button>
              </div>

              {/* Contenu cliquable */}
              <Link
                href={cheminBien(bien)}
                className="block p-4"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <p className="text-xs mb-1" style={{ color: "#888" }}>
                  {bien.type} · {bien.quartier ? `${bien.quartier}, ` : ""}{bien.ville}
                </p>
                <p
                  className="text-base mb-2 leading-snug line-clamp-2"
                  style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}
                >
                  {bien.titre}
                </p>
                <p className="text-xl font-semibold mb-3" style={{ color: "var(--primaire)" }}>
                  {formatPrix(bien.prix, bien.transaction)}
                </p>
                <div
                  className="flex gap-4 text-xs pt-3 border-t"
                  style={{ color: "#666", borderColor: "#EEE8D8" }}
                >
                  <span>{bien.chambres} ch</span>
                  <span>{bien.salles_bain} sdb</span>
                  <span>{bien.surface} m²</span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
