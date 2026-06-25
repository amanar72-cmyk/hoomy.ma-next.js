"use client";

import { useState, useTransition } from "react";
import { modifierZonesAgent } from "@/app/admin/actions";

const VILLES = ["Casablanca", "Marrakech", "Rabat", "Tanger", "Agadir", "Fès"];

type Props = {
  agentId: string;
  nomAgent: string;
  zonesInitiales: string[];
};

export default function ModalZonesAgent({ agentId, nomAgent, zonesInitiales }: Props) {
  const [ouvert, setOuvert]         = useState(false);
  const [zones, setZones]           = useState<string[]>(zonesInitiales);
  const [pending, startTransition]  = useTransition();
  const [succes, setSucces]         = useState(false);

  function toggle(ville: string) {
    setZones((z) => z.includes(ville) ? z.filter((v) => v !== ville) : [...z, ville]);
  }

  function sauvegarder() {
    setSucces(false);
    startTransition(async () => {
      await modifierZonesAgent(agentId, zones);
      setSucces(true);
      setTimeout(() => { setOuvert(false); setSucces(false); }, 900);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="text-xs px-3 py-1.5 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
        style={{ borderColor: "#EBEBEB", color: "#555", background: "#fff" }}
      >
        Zones
      </button>

      {ouvert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setOuvert(false)}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            style={{ background: "#fff" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold mb-0.5" style={{ color: "#111" }}>
                  Zones couvertes
                </h3>
                <p className="text-xs" style={{ color: "#999" }}>{nomAgent}</p>
              </div>
              <button
                type="button"
                onClick={() => setOuvert(false)}
                className="cursor-pointer p-1 rounded-lg hover:bg-gray-100"
                style={{ color: "#BBB" }}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Villes */}
            <div className="flex flex-wrap gap-2 mb-5">
              {VILLES.map((ville) => {
                const actif = zones.includes(ville);
                return (
                  <button
                    key={ville}
                    type="button"
                    onClick={() => toggle(ville)}
                    className="px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer border transition-all"
                    style={actif
                      ? { background: "#111", color: "#fff", borderColor: "#111" }
                      : { background: "#F5F5F5", color: "#555", borderColor: "#EBEBEB" }
                    }
                  >
                    {ville}
                  </button>
                );
              })}
            </div>

            {succes && (
              <p className="text-sm text-center mb-3 font-medium" style={{ color: "#065F46" }}>
                ✓ Zones enregistrées
              </p>
            )}

            {/* Boutons */}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setOuvert(false)}
                className="px-4 py-2 rounded-xl text-sm cursor-pointer hover:opacity-80 transition-opacity"
                style={{ background: "#F5F5F5", color: "#555" }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={sauvegarder}
                disabled={pending}
                className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-60 hover:opacity-90 transition-opacity"
                style={{ background: "#111", color: "#fff" }}
              >
                {pending ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
