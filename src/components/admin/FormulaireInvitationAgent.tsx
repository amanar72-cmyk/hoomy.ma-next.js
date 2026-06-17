"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ajouterAgent } from "@/app/admin/agents/actions";

const VILLES = ["Casablanca", "Marrakech", "Rabat", "Tanger", "Agadir", "Fès"];

// Import dynamique pour éviter l'accès à window/navigator côté serveur
const PhoneInput = dynamic(
  () => import("@/components/admin/ChampTelephone"),
  {
    ssr: false,
    loading: () => (
      <input
        type="tel"
        placeholder="+212 6XX XXX XXX"
        className="border rounded-xl px-4 py-2.5 text-sm w-full"
        style={{ borderColor: "#E0DAC8", color: "#0F4C3A" }}
      />
    ),
  }
);

// ── Helpers UI ─────────────────────────────────────────────────────────────

function Champ({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: "#555" }}>
        {label}{required && <span style={{ color: "#DC2626" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

export default function FormulaireInvitationAgent() {
  const [nomComplet, setNomComplet] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState<string | undefined>(undefined);
  const [zones, setZones] = useState<string[]>([]);

  const [chargement, setChargement] = useState(false);
  const [succes, setSucces] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  function toggleZone(ville: string) {
    setZones((prev) =>
      prev.includes(ville) ? prev.filter((v) => v !== ville) : [...prev, ville]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!nomComplet.trim()) { setErreur("Le nom complet est requis."); return; }
    if (!email.trim() || !email.includes("@")) { setErreur("Adresse e-mail invalide."); return; }

    setErreur(null);
    setSucces(null);
    setChargement(true);

    try {
      await ajouterAgent({
        nomComplet: nomComplet.trim(),
        email: email.trim().toLowerCase(),
        telephone: telephone ?? "",
        zones,
      });

      setSucces(`Invitation envoyée à ${email.trim().toLowerCase()}`);
      // Réinitialise le formulaire
      setNomComplet("");
      setEmail("");
      setTelephone(undefined);
      setZones([]);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inconnue — réessayez.");
    } finally {
      setChargement(false);
    }
  }

  const inp: React.CSSProperties = { borderColor: "#E0DAC8", color: "#0F4C3A", background: "#fff" };
  const cls = "border rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-xl">

      {/* Feedback */}
      {succes && (
        <div className="px-4 py-3 rounded-xl text-sm border flex items-center gap-2"
          style={{ background: "#D1FAE5", color: "#065F46", borderColor: "#6EE7B7" }}>
          <span className="text-lg">✉️</span>
          <span><strong>{succes}</strong> — L'agent recevra un lien pour créer son mot de passe.</span>
        </div>
      )}
      {erreur && (
        <div className="px-4 py-3 rounded-xl text-sm border"
          style={{ background: "#FEF2F2", color: "#991B1B", borderColor: "#FECACA" }}>
          {erreur}
        </div>
      )}

      {/* Champs */}
      <div className="rounded-2xl border p-5 flex flex-col gap-4"
        style={{ background: "#fff", borderColor: "#F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.05)" }}>

        <Champ label="Nom complet" required>
          <input
            type="text"
            value={nomComplet}
            onChange={(e) => setNomComplet(e.target.value)}
            placeholder="Prénom Nom"
            className={cls} style={inp}
          />
        </Champ>

        <Champ label="Adresse e-mail" required>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="agent@exemple.com"
            autoComplete="email"
            className={cls} style={inp}
          />
        </Champ>

        <Champ label="Téléphone (international)">
          {/* Chargé dynamiquement pour éviter les erreurs SSR */}
          <div className="phone-input-wrapper">
            <PhoneInput
              value={telephone}
              onChange={(val) => setTelephone(val)}
              defaultCountry="MA"
              placeholder="+212 6XX XXX XXX"
              className="phone-input-hoomy"
            />
          </div>
          <style>{`
            .phone-input-wrapper { position: relative; }
            .phone-input-hoomy { border: 1px solid #E0DAC8; border-radius: 12px; padding: 10px 16px; font-size: 14px; color: #0F4C3A; background: #fff; width: 100%; display: flex; align-items: center; gap: 8px; }
            .phone-input-hoomy input { outline: none; border: none; background: transparent; flex: 1; color: #0F4C3A; font-size: 14px; }
            .phone-input-hoomy .PhoneInputCountry { display: flex; align-items: center; }
          `}</style>
        </Champ>

        <Champ label="Zones d'intervention">
          <div className="flex flex-wrap gap-2 mt-1">
            {VILLES.map((v) => {
              const actif = zones.includes(v);
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => toggleZone(v)}
                  className="px-3 py-1.5 rounded-full text-sm border cursor-pointer transition-all"
                  style={actif
                    ? { background: "#0F4C3A", color: "#fff", borderColor: "#0F4C3A" }
                    : { background: "#F4F6F5", color: "#6B7A71", borderColor: "#E0DAC8" }
                  }
                >
                  {v}
                </button>
              );
            })}
          </div>
          {zones.length > 0 && (
            <p className="text-xs mt-1" style={{ color: "#9DB8AD" }}>
              {zones.length} ville{zones.length > 1 ? "s" : ""} sélectionnée{zones.length > 1 ? "s" : ""}
            </p>
          )}
        </Champ>
      </div>

      {/* Note d'information */}
      <div className="rounded-xl px-4 py-3 text-sm flex items-start gap-2"
        style={{ background: "#F4F6F5", border: "1px solid #E0DAC8", color: "#6B7A71" }}>
        <span className="flex-shrink-0">ℹ️</span>
        <span>
          L'agent recevra un e-mail avec un lien pour créer son mot de passe.
          Aucun mot de passe n'est défini par l'administrateur.
        </span>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={chargement}
          className="px-7 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60 hover:opacity-90 transition-opacity"
          style={{ background: "#0F4C3A", color: "#fff" }}
        >
          {chargement ? "Envoi de l'invitation…" : "Inviter l'agent"}
        </button>
      </div>
    </form>
  );
}
