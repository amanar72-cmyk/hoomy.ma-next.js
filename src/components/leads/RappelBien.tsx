"use client";

// Section « Être rappelé pour ce bien » sur les fiches — ouvre le formulaire
// de qualification en modal (bien_id + type de projet pré-remplis, source fiche_bien).

import { useEffect, useState } from "react";
import FormulaireLead from "./FormulaireLead";

type Props = {
  bienId: string;
  titreBien: string;
  transaction: string; // "vente" → le visiteur veut acheter ; "location" → louer
};

export default function RappelBien({ bienId, titreBien, transaction }: Props) {
  const [ouvert, setOuvert] = useState(false);

  // Échap pour fermer + scroll verrouillé quand le modal est ouvert
  useEffect(() => {
    if (!ouvert) return;
    function surTouche(e: KeyboardEvent) {
      if (e.key === "Escape") setOuvert(false);
    }
    document.addEventListener("keydown", surTouche);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", surTouche);
      document.body.style.overflow = "";
    };
  }, [ouvert]);

  return (
    <>
      {/* Carte d'appel — dans le flux de la fiche */}
      <section
        className="rounded-2xl px-6 py-6 mb-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6"
        style={{
          background: "linear-gradient(135deg, #0F4C3A 0%, #146C43 100%)",
          boxShadow: "0 8px 32px rgba(15,76,58,0.18)",
        }}
      >
        <div className="flex-1">
          <p
            className="text-lg font-normal mb-1"
            style={{ fontFamily: "var(--font-marcellus), serif", color: "#fff" }}
          >
            Intéressé(e) par ce bien ?
          </p>
          <p className="text-sm" style={{ color: "#A8D5B8" }}>
            Dites-nous en plus sur votre projet — un conseiller dédié vous rappelle sous 24 h.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOuvert(true)}
          className="flex-shrink-0 px-6 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:shadow-lg hover:-translate-y-px"
          style={{ background: "#D4AF37", color: "#0F4C3A" }}
        >
          Être rappelé(e)
        </button>
      </section>

      {/* Modal */}
      {ouvert && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ zIndex: 10005, background: "rgba(10,30,20,0.55)", backdropFilter: "blur(3px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOuvert(false); }}
        >
          <div
            className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-y-auto"
            style={{ background: "var(--fond-principal, #FAF7F0)", maxHeight: "92dvh" }}
          >
            {/* En-tête */}
            <div
              className="sticky top-0 flex items-start justify-between gap-4 px-6 py-4"
              style={{ background: "var(--fond-principal, #FAF7F0)", borderBottom: "1px solid #EDE7D7", zIndex: 1 }}
            >
              <div>
                <p
                  className="text-base font-normal"
                  style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}
                >
                  Être rappelé(e) pour ce bien
                </p>
                <p className="text-xs line-clamp-1 mt-0.5" style={{ color: "#9DB8AD" }}>
                  {titreBien}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOuvert(false)}
                aria-label="Fermer"
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background: "#F0EDE5", color: "#6B7A71" }}
              >
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5">
              <FormulaireLead
                source="fiche_bien"
                bienId={bienId}
                titreBien={titreBien}
                typeProjetInitial={transaction === "location" ? "location" : "achat"}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
