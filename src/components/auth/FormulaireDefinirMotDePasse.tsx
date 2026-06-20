"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

export default function FormulaireDefinirMotDePasse() {
  const router = useRouter();

  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [afficherMdp, setAfficherMdp] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (motDePasse.length < 8) {
      setErreur("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (motDePasse !== confirmation) {
      setErreur("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setErreur(null);
    setChargement(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: motDePasse });

      if (error) {
        if (error.message.includes("session")) {
          setErreur("Lien d'invitation expiré ou déjà utilisé. Contactez votre administrateur.");
        } else {
          setErreur(error.message);
        }
        setChargement(false);
        return;
      }

      setSucces(true);
      // Courte pause pour afficher le message de succès avant la redirection
      setTimeout(() => router.push("/pro"), 1500);
    } catch {
      setErreur("Erreur inattendue — réessayez.");
      setChargement(false);
    }
  }

  const inp: React.CSSProperties = { borderColor: "var(--bordure-chaude)", color: "var(--primaire)", background: "var(--fond-secondaire)" };

  if (succes) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12"
        style={{ background: "linear-gradient(160deg,#f0f7f4 0%,#FAF7F0 60%,#f5efe3 100%)" }}>
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Link href="/" style={{ textDecoration: "none" }}><Logo size={40} /></Link>
          </div>
          <div className="rounded-2xl p-8 text-center"
            style={{ background: "var(--fond-secondaire)", boxShadow: "0 4px 32px rgba(15,76,58,0.10)" }}>
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-xl mb-2"
              style={{ fontFamily: "var(--font-marcellus),serif", color: "var(--primaire)" }}>
              Mot de passe défini !
            </h1>
            <p className="text-sm" style={{ color: "var(--texte-tertiaire)" }}>
              Redirection vers votre espace pro…
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(160deg,#f0f7f4 0%,#FAF7F0 60%,#f5efe3 100%)" }}>
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/" style={{ textDecoration: "none" }}><Logo size={40} /></Link>
        </div>

        <div className="rounded-2xl p-8"
          style={{ background: "var(--fond-secondaire)", boxShadow: "0 4px 32px rgba(15,76,58,0.10)" }}>
          <h1 className="text-2xl font-normal mb-1 text-center"
            style={{ fontFamily: "var(--font-marcellus),serif", color: "var(--primaire)" }}>
            Créer votre mot de passe
          </h1>
          <p className="text-sm text-center mb-7" style={{ color: "var(--texte-tertiaire)" }}>
            Bienvenue sur HOOMY.MA — définissez votre mot de passe pour accéder à votre espace agent.
          </p>

          {erreur && (
            <div className="mb-5 px-4 py-3 rounded-lg text-sm border"
              style={{ background: "#FEF2F2", color: "var(--erreur-texte)", borderColor: "#FECACA" }}>
              {erreur}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: "#555" }}>
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type={afficherMdp ? "text" : "password"}
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Minimum 8 caractères"
                  className="w-full border rounded-xl px-4 py-3 text-sm pr-11 focus:outline-none"
                  style={inp}
                />
                <button
                  type="button"
                  onClick={() => setAfficherMdp((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ color: "var(--texte-tertiaire)" }}
                >
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    {afficherMdp
                      ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>
                      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
                    }
                  </svg>
                </button>
              </div>
              {motDePasse.length > 0 && motDePasse.length < 8 && (
                <p className="text-xs mt-1" style={{ color: "var(--erreur)" }}>
                  {8 - motDePasse.length} caractère{8 - motDePasse.length > 1 ? "s" : ""} manquant{8 - motDePasse.length > 1 ? "s" : ""}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: "#555" }}>
                Confirmer le mot de passe
              </label>
              <input
                type={afficherMdp ? "text" : "password"}
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                autoComplete="new-password"
                placeholder="Répétez le mot de passe"
                className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none"
                style={{
                  ...inp,
                  borderColor: confirmation.length > 0 && confirmation !== motDePasse ? "#FECACA" : "var(--bordure-chaude)",
                }}
              />
              {confirmation.length > 0 && confirmation !== motDePasse && (
                <p className="text-xs mt-1" style={{ color: "var(--erreur)" }}>
                  Les mots de passe ne correspondent pas.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={chargement || motDePasse.length < 8 || motDePasse !== confirmation}
              className="w-full py-3 rounded-xl text-sm font-semibold hover:opacity-90 mt-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style={{ background: "var(--primaire)", color: "var(--fond-secondaire)" }}
            >
              {chargement ? "Enregistrement…" : "Définir mon mot de passe"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
