"use client";

import { useState, useTransition } from "react";
import { confirmerVisite, marquerRealisee, annulerVisite } from "@/app/pro/actions";

type Props = {
  demandeId: string;
  statut: string;
};

export default function ActionsDemandeVisite({ demandeId, statut }: Props) {
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateConfirmee, setDateConfirmee] = useState("");

  function executer(action: () => Promise<void>) {
    setErreur(null);
    startTransition(async () => {
      try {
        await action();
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Erreur — réessayez.");
      }
    });
  }

  if (statut === "realisee" || statut === "annulee") return null;

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex flex-col gap-2">
      {erreur && (
        <p className="text-xs" style={{ color: "#DC2626" }}>{erreur}</p>
      )}

      <div className="flex gap-2 flex-wrap items-center">
        {statut === "nouvelle" && (
          <>
            {showDatePicker ? (
              <>
                <input
                  type="date"
                  value={dateConfirmee}
                  onChange={(e) => setDateConfirmee(e.target.value)}
                  min={today}
                  className="border rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                  style={{ borderColor: "#E0DAC8", color: "#1f2a24" }}
                />
                <button
                  type="button"
                  disabled={!dateConfirmee || pending}
                  onClick={() => executer(() => confirmerVisite(demandeId, dateConfirmee))}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-60 transition-opacity"
                  style={{ background: "#0F4C3A", color: "#fff" }}
                >
                  {pending ? "…" : "Valider la date"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(false)}
                  className="text-xs px-3 py-1.5 rounded-lg cursor-pointer"
                  style={{ background: "#F0EDE5", color: "#6B7A71" }}
                >
                  ← Retour
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => setShowDatePicker(true)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                style={{ background: "#0F4C3A", color: "#fff" }}
              >
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Confirmer la visite
              </button>
            )}

            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (window.confirm("Annuler cette demande de visite ?")) {
                  executer(() => annulerVisite(demandeId));
                }
              }}
              className="text-xs px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-60"
              style={{ background: "#FEE2E2", color: "#991B1B" }}
            >
              Annuler
            </button>
          </>
        )}

        {statut === "confirmee" && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => executer(() => marquerRealisee(demandeId))}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
              style={{ background: "#D1FAE5", color: "#065F46" }}
            >
              {pending ? "…" : (
                <>
                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Marquer comme réalisée
                </>
              )}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (window.confirm("Annuler cette visite confirmée ?")) {
                  executer(() => annulerVisite(demandeId));
                }
              }}
              className="text-xs px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-60"
              style={{ background: "#FEE2E2", color: "#991B1B" }}
            >
              Annuler
            </button>
          </>
        )}
      </div>
    </div>
  );
}
