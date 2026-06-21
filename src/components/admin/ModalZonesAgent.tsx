"use client";

// Modal de sélection des zones couvertes par un agent
import { useState, useTransition } from "react";
import { modifierZonesAgent } from "@/app/admin/actions";

const VILLES = ["Casablanca", "Marrakech", "Rabat", "Tanger", "Agadir", "Fès"];

type Props = {
  agentId: string;
  nomAgent: string;
  zonesInitiales: string[];
};

export default function ModalZonesAgent({ agentId, nomAgent, zonesInitiales }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [zones, setZones] = useState<string[]>(zonesInitiales);
  const [pending, startTransition] = useTransition();
  const [succes, setSucces] = useState(false);

  function toggle(ville: string) {
    setZones((z) =>
      z.includes(ville) ? z.filter((v) => v !== ville) : [...z, ville]
    );
  }

  function sauvegarder() {
    setSucces(false);
    startTransition(async () => {
      await modifierZonesAgent(agentId, zones);
      setSucces(true);
      setTimeout(() => { setOuvert(false); setSucces(false); }, 800);
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOuvert(true)}
        className="text-xs px-2.5 py-1 rounded-lg cursor-pointer border"
        style={{ borderColor: "#E0DAC8", color: "#0F4C3A" }}>
        Modifier zones
      </button>

      {ouvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setOuvert(false)}>
          <div className="rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            style={{ background: "#fff" }}
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-normal mb-1"
              style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
              Zones couvertes
            </h3>
            <p className="text-xs mb-5" style={{ color: "#9DB8AD" }}>{nomAgent}</p>

            <div className="flex flex-wrap gap-2 mb-6">
              {VILLES.map((ville) => {
                const actif = zones.includes(ville);
                return (
                  <button key={ville} type="button" onClick={() => toggle(ville)}
                    className="px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer border transition-all"
                    style={actif
                      ? { background: "#0F4C3A", color: "#fff", borderColor: "#0F4C3A" }
                      : { background: "#F4F6F5", color: "#6B7A71", borderColor: "#E0DAC8" }
                    }>
                    {ville}
                  </button>
                );
              })}
            </div>

            {succes && (
              <p className="text-sm text-center mb-3" style={{ color: "#065F46" }}>
                ✓ Zones enregistrées
              </p>
            )}

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setOuvert(false)}
                className="px-4 py-2 rounded-xl text-sm cursor-pointer"
                style={{ background: "#F4F6F5", color: "#6B7A71" }}>
                Annuler
              </button>
              <button type="button" onClick={sauvegarder} disabled={pending}
                className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-60"
                style={{ background: "#0F4C3A", color: "#fff" }}>
                {pending ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
