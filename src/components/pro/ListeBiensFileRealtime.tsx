"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { accepterBien } from "@/app/pro/biens/actions";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BienFile = {
  id: string;
  reference: string | null;
  titre: string;
  type: string;
  transaction: string;
  prix: number;
  ville: string;
  quartier: string | null;
  photos: string[] | null;
  surface: number;
  chambres: number;
  cree_le: string;
};

// ── Utilitaires ───────────────────────────────────────────────────────────────

function formaterPrix(prix: number, transaction: string) {
  const m = prix.toLocaleString("fr-MA");
  return transaction === "location" ? `${m} DH/mois` : `${m} DH`;
}

function formaterDate(d: string) {
  return new Date(d).toLocaleDateString("fr-MA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ── Carte d'un bien en file ───────────────────────────────────────────────────

function CarteBienFile({
  bien,
  erreur,
  estEnChargement,
  onAccepter,
}: {
  bien: BienFile;
  erreur: string | null;
  estEnChargement: boolean;
  onAccepter: () => void;
}) {
  const photo = bien.photos?.[0] ?? null;

  return (
    <article
      className="rounded-2xl overflow-hidden"
      style={{
        background: "#fff",
        border: "1px solid #F0EDE5",
        boxShadow: "0 2px 12px rgba(15,76,58,0.06)",
        opacity: estEnChargement ? 0.7 : 1,
        transition: "opacity 0.2s",
      }}
    >
      <div className="flex gap-4 p-4">
        {/* Photo */}
        <div
          className="flex-shrink-0 rounded-xl overflow-hidden"
          style={{ width: 104, height: 84, background: "#F4F6F5" }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={bien.titre} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#C4D8CE" strokeWidth="1.2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
          )}
        </div>

        {/* Infos + action */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
              <p className="text-sm font-semibold leading-snug" style={{ color: "#1f2a24" }}>
                {bien.titre}
              </p>
              {bien.reference && (
                <span
                  className="text-xs font-mono px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: "#F0EDE5", color: "#9DB8AD" }}
                >
                  {bien.reference}
                </span>
              )}
            </div>

            <p className="text-xs" style={{ color: "#9DB8AD" }}>
              {bien.type}
              {bien.quartier ? ` · ${bien.quartier}` : ""}
              {" · "}{bien.ville}
            </p>

            <p className="text-sm font-bold mt-1" style={{ color: "#0F4C3A" }}>
              {formaterPrix(bien.prix, bien.transaction)}
            </p>

            <div className="flex gap-3 mt-0.5 text-xs" style={{ color: "#C4D8CE" }}>
              {bien.chambres > 0 && <span>{bien.chambres} ch.</span>}
              <span>{bien.surface} m²</span>
              <span>Soumis le {formaterDate(bien.cree_le)}</span>
            </div>
          </div>

          {/* Bouton accepter */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              disabled={estEnChargement}
              onClick={onAccepter}
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all"
              style={{
                background: estEnChargement ? "#9DB8AD" : "#0F4C3A",
                color: "#fff",
                cursor: estEnChargement ? "default" : "pointer",
              }}
            >
              {estEnChargement ? (
                "Traitement…"
              ) : (
                <>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Accepter ce bien
                </>
              )}
            </button>

            {erreur && (
              <p className="text-xs" style={{ color: "#DC2626" }}>{erreur}</p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function ListeBiensFileRealtime({
  biensInitiaux,
}: {
  biensInitiaux: BienFile[];
}) {
  const [biens, setBiens] = useState<BienFile[]>(biensInitiaux);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [chargement, setChargement] = useState<Record<string, boolean>>({});

  // Abonnement Realtime — retire un bien quand dans_file devient false
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("file-biens-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "biens" },
        (payload) => {
          const nouveau = payload.new as { id: string; dans_file: boolean };
          if (!nouveau.dans_file) {
            setBiens((prev) => prev.filter((b) => b.id !== nouveau.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleAccepter(bienId: string) {
    setChargement((prev) => ({ ...prev, [bienId]: true }));
    setErreurs((prev) => {
      const suivant = { ...prev };
      delete suivant[bienId];
      return suivant;
    });

    try {
      await accepterBien(bienId);
      setBiens((prev) => prev.filter((b) => b.id !== bienId));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur — réessayez.";
      const estPrisParAutre =
        msg.toLowerCase().includes("déjà") ||
        msg.toLowerCase().includes("pris") ||
        msg.toLowerCase().includes("assigned");
      setErreurs((prev) => ({
        ...prev,
        [bienId]: estPrisParAutre
          ? "Ce bien vient d'être pris par un autre conseiller."
          : msg,
      }));
    } finally {
      setChargement((prev) => ({ ...prev, [bienId]: false }));
    }
  }

  if (biens.length === 0) {
    return (
      <div
        className="rounded-2xl flex flex-col items-center justify-center py-16 px-6 text-center"
        style={{ background: "#fff", border: "1px solid #F0EDE5" }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "#F0FAF4" }}
        >
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#0F4C3A" strokeWidth="1.5">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
          </svg>
        </div>
        <p className="text-sm font-semibold mb-1" style={{ color: "#0F4C3A" }}>
          Aucun bien en attente
        </p>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>
          Les biens dans votre zone d'intervention apparaîtront ici en temps réel.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {biens.map((b) => (
        <CarteBienFile
          key={b.id}
          bien={b}
          erreur={erreurs[b.id] ?? null}
          estEnChargement={chargement[b.id] ?? false}
          onAccepter={() => handleAccepter(b.id)}
        />
      ))}
    </div>
  );
}
