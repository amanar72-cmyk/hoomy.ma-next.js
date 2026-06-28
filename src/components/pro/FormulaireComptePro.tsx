"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
  nomComplet: string;
  telephone: string;
  email: string;
  role: string;
};

const COULEURS_ROLE: Record<string, { bg: string; color: string }> = {
  admin:  { bg: "#FEF3C7", color: "#92400E" },
  agent:  { bg: "#D1FAE5", color: "#065F46" },
  agence: { bg: "#DBEAFE", color: "#1E40AF" },
};

function ChampLecture({ label, valeur, note }: { label: string; valeur: string; note?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "#9DB8AD" }}>
        {label}
      </label>
      <div
        className="w-full border rounded-xl px-4 py-2.5 text-sm"
        style={{ borderColor: "#E0DAC8", color: "#6B7280", background: "#F9F7F4", cursor: "default" }}
      >
        {valeur || <span style={{ color: "#C4D8CE" }}>—</span>}
      </div>
      {note && <p className="text-xs mt-1" style={{ color: "#C4D8CE" }}>{note}</p>}
    </div>
  );
}

export default function FormulaireComptePro({ nomComplet, telephone, email, role }: Props) {
  const [envoi,    setEnvoi]    = useState<"idle" | "chargement" | "succes" | "erreur">("idle");
  const [erreur,   setErreur]   = useState<string | null>(null);

  const couleurRole = COULEURS_ROLE[role] ?? { bg: "#F3F4F6", color: "#6B7280" };

  async function demanderReset() {
    setEnvoi("chargement");
    setErreur(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/definir-mot-de-passe`,
      });
      if (error) { setErreur(error.message); setEnvoi("erreur"); }
      else        { setEnvoi("succes"); }
    } catch {
      setErreur("Une erreur inattendue est survenue.");
      setEnvoi("erreur");
    }
  }

  return (
    <div className="max-w-2xl flex flex-col gap-6">

      {/* ── Informations personnelles (lecture seule) ───────────────────── */}
      <section
        className="rounded-2xl p-6 border"
        style={{ background: "#fff", borderColor: "#F0EDE5", boxShadow: "0 2px 16px rgba(15,76,58,0.05)" }}
      >
        <h2 className="text-base font-medium mb-1" style={{ color: "#0F4C3A" }}>
          Informations personnelles
        </h2>
        <p className="text-xs mb-5" style={{ color: "#C4D8CE" }}>
          Ces informations sont gérées par l&apos;administration. Contactez-nous pour toute modification.
        </p>

        <div className="flex flex-col gap-4">
          <ChampLecture label="Nom complet" valeur={nomComplet} />
          <ChampLecture
            label="Adresse email professionnelle"
            valeur={email}
            note="Non modifiable via cette interface."
          />
          <ChampLecture
            label="Téléphone"
            valeur={telephone}
            note="Non modifiable via cette interface."
          />
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#9DB8AD" }}>Rôle</label>
            <span
              className="inline-flex items-center text-xs px-3 py-1.5 rounded-full font-medium capitalize"
              style={{ background: couleurRole.bg, color: couleurRole.color }}
            >
              {role}
            </span>
          </div>
        </div>
      </section>

      {/* ── Sécurité — reset par email ──────────────────────────────────── */}
      <section
        className="rounded-2xl p-6 border"
        style={{ background: "#fff", borderColor: "#F0EDE5", boxShadow: "0 2px 16px rgba(15,76,58,0.05)" }}
      >
        <h2 className="text-base font-medium mb-1" style={{ color: "#0F4C3A" }}>Sécurité</h2>
        <p className="text-sm mb-5" style={{ color: "#9DB8AD" }}>
          Pour changer votre mot de passe, nous vous envoyons un lien sécurisé à votre adresse email.
        </p>

        {envoi === "succes" && (
          <div
            className="mb-4 px-4 py-3 rounded-xl text-sm flex items-start gap-2"
            style={{ background: "#D1FAE5", color: "#065F46" }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.61 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17z" />
            </svg>
            <div>
              <p className="font-medium">Email envoyé !</p>
              <p className="text-xs mt-0.5" style={{ color: "#065F46", opacity: 0.8 }}>
                Vérifiez votre boîte mail ({email}) et cliquez sur le lien pour définir votre nouveau mot de passe.
              </p>
            </div>
          </div>
        )}

        {(envoi === "erreur") && erreur && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: "#FEE2E2", color: "#991B1B" }}>
            {erreur}
          </div>
        )}

        <div
          className="flex items-center justify-between p-4 rounded-xl mb-5"
          style={{ background: "#F9F7F4", border: "1px solid #F0EDE5" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "#E8F5ED" }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#0F4C3A" strokeWidth="1.8">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "#1f2a24" }}>Mot de passe</p>
              <p className="text-xs" style={{ color: "#9DB8AD" }}>Lien envoyé à {email}</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={demanderReset}
          disabled={envoi === "chargement" || envoi === "succes"}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 transition-opacity hover:opacity-90"
          style={{ background: "#D4AF37", color: "#0F4C3A" }}
        >
          {envoi === "chargement"
            ? "Envoi en cours…"
            : envoi === "succes"
            ? "Email envoyé ✓"
            : "Demander un lien de réinitialisation"}
        </button>
      </section>
    </div>
  );
}
