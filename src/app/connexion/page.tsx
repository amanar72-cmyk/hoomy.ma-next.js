"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

export default function PageConnexion() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [afficherMdp, setAfficherMdp] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [chargementGoogle, setChargementGoogle] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function seConnecter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        setErreur("Email ou mot de passe incorrect. Vérifiez vos identifiants.");
      } else if (error.message.includes("Email not confirmed")) {
        setErreur("Votre email n'est pas encore confirmé. Consultez votre boîte mail.");
      } else {
        setErreur("Une erreur est survenue. Veuillez réessayer.");
      }
      setChargement(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleGoogleSignIn() {
    console.log("[HOOMY] Clic Google — démarrage OAuth");
    setErreur(null);
    setChargementGoogle(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error("[HOOMY] Erreur OAuth Google :", error.message);
      setErreur("Impossible de se connecter avec Google. Réessayez.");
      setChargementGoogle(false);
    }
  }

  const inputStyle = {
    borderColor: "#E0DAC8",
    color: "#0F4C3A",
    background: "#fff",
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(160deg, #f0f7f4 0%, #FAF7F0 60%, #f5efe3 100%)" }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" style={{ textDecoration: "none" }}>
            <Logo size={40} />
          </Link>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{ background: "#fff", boxShadow: "0 4px 32px rgba(15,76,58,0.10)" }}
        >
          <h1
            className="text-2xl font-normal mb-1 text-center"
            style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}
          >
            Connexion à votre compte
          </h1>
          <p className="text-sm text-center mb-7" style={{ color: "#9DB8AD" }}>
            Bienvenue sur HOOMY.MA
          </p>

          {/* Message erreur */}
          {erreur && (
            <div
              className="mb-5 px-4 py-3 rounded-lg text-sm border"
              style={{ background: "#FEF2F2", color: "#991B1B", borderColor: "#FECACA" }}
            >
              {erreur}
            </div>
          )}

          <form onSubmit={seConnecter} className="flex flex-col gap-4">
            {/* Email */}
            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: "#555" }}>
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="vous@exemple.com"
                className="w-full border rounded-xl px-4 py-3 text-sm focus:ring-2 transition-all"
                style={inputStyle}
              />
            </div>

            {/* Mot de passe */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium" style={{ color: "#555" }}>
                  Mot de passe
                </label>
                <Link
                  href="/mot-de-passe-oublie"
                  className="text-xs hover:underline"
                  style={{ color: "#146C43", textDecoration: "none" }}
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={afficherMdp ? "text" : "password"}
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full border rounded-xl px-4 py-3 text-sm pr-11 focus:ring-2 transition-all"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setAfficherMdp((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ color: "#9DB8AD" }}
                  aria-label={afficherMdp ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {afficherMdp ? (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Bouton connexion */}
            <button
              type="submit"
              disabled={chargement}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 mt-1 cursor-pointer disabled:opacity-60"
              style={{ background: "#0F4C3A", color: "#fff" }}
            >
              {chargement ? "Connexion en cours…" : "Se connecter"}
            </button>
          </form>

          {/* Séparateur */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: "#E8E2D2" }} />
            <span className="text-xs" style={{ color: "#B4AD97" }}>ou</span>
            <div className="flex-1 h-px" style={{ background: "#E8E2D2" }} />
          </div>

          {/* Bouton Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={chargementGoogle}
            className="w-full flex items-center justify-center gap-3 border py-3 rounded-xl text-sm font-medium transition-colors hover:bg-gray-50 cursor-pointer disabled:opacity-60"
            style={{ borderColor: "#E0DAC8", color: "#3D4A42" }}
          >
            {/* Logo Google */}
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.7-6.7C35.8 2.5 30.2 0 24 0 14.8 0 6.9 5.4 3 13.3l7.8 6.1C12.6 13 17.9 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.6 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7.1-10.1 7.1-17.1z"/>
              <path fill="#FBBC05" d="M10.8 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6L2.5 13.3A24 24 0 0 0 0 24c0 3.9.9 7.5 2.5 10.7l8.3-6.1z"/>
              <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.6-5.9c-2 1.4-4.7 2.2-7.6 2.2-6.1 0-11.3-4.1-13.2-9.6l-8.3 6.1C6.9 42.6 14.8 48 24 48z"/>
            </svg>
            {chargementGoogle ? "Redirection…" : "Continuer avec Google"}
          </button>

          {/* Lien inscription */}
          <p className="text-center text-sm mt-6" style={{ color: "#888" }}>
            Pas encore de compte ?{" "}
            <Link href="/inscription" style={{ color: "#146C43", textDecoration: "none" }} className="font-medium hover:underline">
              S'inscrire
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
