"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

export default function FormulaireMotDePasseOublie() {
  const [email, setEmail] = useState("");
  const [etat, setEtat] = useState<"idle" | "chargement" | "envoye">("idle");
  const [erreur, setErreur] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setErreur("Adresse e-mail invalide.");
      return;
    }
    setErreur(null);
    setEtat("chargement");
    try {
      const supabase = createClient();
      const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      // redirectTo via /auth/callback : le callback échange le token de
      // récupération et établit la SESSION avant d'arriver sur la page de
      // définition du mot de passe. Sans ce passage, definir-mot-de-passe
      // ne verrait aucune session et repartirait sur /connexion.
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${base}/auth/callback?next=/auth/definir-mot-de-passe`,
      });

      // Message TOUJOURS générique en cas de succès : ne pas révéler si un
      // compte existe pour cette adresse (anti-énumération).
      if (error) {
        setErreur(error.message);
        setEtat("idle");
      } else {
        setEtat("envoye");
      }
    } catch {
      setErreur("Une erreur inattendue est survenue — réessayez.");
      setEtat("idle");
    }
  }

  const inp: React.CSSProperties = {
    borderColor: "var(--bordure-chaude)",
    color: "var(--primaire)",
    background: "var(--fond-secondaire)",
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(160deg,#f0f7f4 0%,#FAF7F0 60%,#f5efe3 100%)" }}
    >
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/" style={{ textDecoration: "none" }}><Logo size={40} /></Link>
        </div>

        <div className="rounded-2xl p-8"
          style={{ background: "var(--fond-secondaire)", boxShadow: "0 4px 32px rgba(15,76,58,0.10)" }}>

          {etat === "envoye" ? (
            <div className="text-center">
              <h1 className="text-2xl font-normal mb-3"
                style={{ fontFamily: "var(--font-marcellus),serif", color: "var(--primaire)" }}>
                E-mail envoyé
              </h1>
              <p className="text-sm mb-6" style={{ color: "var(--texte-corps)", lineHeight: 1.6 }}>
                Si un compte existe avec cette adresse, un e-mail contenant un lien de
                réinitialisation vient d&apos;être envoyé. Pensez à vérifier vos spams.
              </p>
              <Link href="/connexion" className="text-sm hover:underline"
                style={{ color: "var(--primaire-clair)", textDecoration: "none" }}>
                ← Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-normal mb-1 text-center"
                style={{ fontFamily: "var(--font-marcellus),serif", color: "var(--primaire)" }}>
                Mot de passe oublié
              </h1>
              <p className="text-sm text-center mb-7" style={{ color: "var(--texte-tertiaire)" }}>
                Entrez votre adresse e-mail : nous vous enverrons un lien pour le réinitialiser.
              </p>

              {erreur && (
                <div className="mb-5 px-4 py-3 rounded-lg text-sm"
                  style={{ background: "var(--erreur-fond)", color: "var(--erreur-texte)", border: "1px solid var(--erreur)" }}>
                  {erreur}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs mb-1.5 font-medium" style={{ color: "#555" }}>
                    Adresse email
                  </label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email" placeholder="vous@exemple.com"
                    className="w-full border rounded-xl px-4 py-3 text-sm" style={inp} />
                </div>

                <button type="submit" disabled={etat === "chargement"}
                  className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60 hover:opacity-90 transition-opacity"
                  style={{ background: "var(--primaire)", color: "#fff" }}>
                  {etat === "chargement" ? "Envoi en cours…" : "Envoyer le lien"}
                </button>
              </form>

              <p className="text-center mt-6">
                <Link href="/connexion" className="text-sm hover:underline"
                  style={{ color: "var(--primaire-clair)", textDecoration: "none" }}>
                  ← Retour à la connexion
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
