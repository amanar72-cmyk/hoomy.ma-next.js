"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

export default function FormulaireConnexion() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [afficherMdp, setAfficherMdp] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [chargementGoogle, setChargementGoogle] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function seConnecter() {
    if (!email || !motDePasse) { setErreur("Veuillez remplir tous les champs."); return; }
    setErreur(null);
    setChargement(true);
    try {
      const supabase = createClient();
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: motDePasse,
      });
      if (error) {
        setErreur("Email ou mot de passe incorrect.");
        setChargement(false);
        return;
      }

      let destination = "/mon-compte";
      if (authData.user) {
        const { data: profil } = await supabase
          .from("profils")
          .select("role")
          .eq("id", authData.user.id)
          .single();
        const role = profil?.role ?? "acheteur";
        if (role === "admin") destination = "/admin";
        else if (role === "agent" || role === "agence") destination = "/pro";
      }

      router.push(destination);
      router.refresh();
    } catch {
      setErreur("Erreur inattendue — réessayez.");
      setChargement(false);
    }
  }

  async function seConnecterGoogle() {
    setErreur(null);
    setChargementGoogle(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setErreur(`Google : ${error.message}`);
        setChargementGoogle(false);
      }
    } catch {
      setErreur("Erreur inattendue Google.");
      setChargementGoogle(false);
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
          <h1 className="text-2xl font-normal mb-1 text-center"
            style={{ fontFamily: "var(--font-marcellus),serif", color: "var(--primaire)" }}>
            Connexion
          </h1>
          <p className="text-sm text-center mb-7" style={{ color: "var(--texte-tertiaire)" }}>
            Bienvenue sur HOOMY.MA
          </p>

          {erreur && (
            <div className="mb-5 px-4 py-3 rounded-lg text-sm border"
              style={{ background: "#FEF2F2", color: "var(--erreur-texte)", borderColor: "#FECACA" }}>
              {erreur}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: "#555" }}>
                Adresse email
              </label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="email" placeholder="vous@exemple.com"
                className="w-full border rounded-xl px-4 py-3 text-sm" style={inp} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium" style={{ color: "#555" }}>Mot de passe</label>
                <Link href="/mot-de-passe-oublie" className="text-xs hover:underline"
                  style={{ color: "var(--primaire-clair)", textDecoration: "none" }}>
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <input type={afficherMdp ? "text" : "password"} value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && seConnecter()}
                  autoComplete="current-password" placeholder="••••••••"
                  className="w-full border rounded-xl px-4 py-3 text-sm pr-11" style={inp} />
                <button type="button" onClick={() => setAfficherMdp((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ color: "var(--texte-tertiaire)" }}>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    {afficherMdp ? (
                      <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>
                    ) : (
                      <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <button type="button" onClick={seConnecter} disabled={chargement}
              className="w-full py-3 rounded-xl text-sm font-semibold hover:opacity-90 mt-1 cursor-pointer disabled:opacity-60"
              style={{ background: "var(--primaire)", color: "var(--fond-secondaire)" }}>
              {chargement ? "Connexion…" : "Se connecter"}
            </button>
          </div>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: "#E8E2D2" }} />
            <span className="text-xs" style={{ color: "#B4AD97" }}>ou</span>
            <div className="flex-1 h-px" style={{ background: "#E8E2D2" }} />
          </div>

          <button type="button" onClick={seConnecterGoogle} disabled={chargementGoogle}
            className="w-full flex items-center justify-center gap-3 border py-3 rounded-xl text-sm font-medium hover:bg-gray-50 cursor-pointer disabled:opacity-60"
            style={{ borderColor: "var(--bordure-chaude)", color: "var(--texte-corps)" }}>
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.7-6.7C35.8 2.5 30.2 0 24 0 14.8 0 6.9 5.4 3 13.3l7.8 6.1C12.6 13 17.9 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.6 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7.1-10.1 7.1-17.1z"/>
              <path fill="#FBBC05" d="M10.8 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6L2.5 13.3A24 24 0 0 0 0 24c0 3.9.9 7.5 2.5 10.7l8.3-6.1z"/>
              <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.6-5.9c-2 1.4-4.7 2.2-7.6 2.2-6.1 0-11.3-4.1-13.2-9.6l-8.3 6.1C6.9 42.6 14.8 48 24 48z"/>
            </svg>
            {chargementGoogle ? "Redirection…" : "Continuer avec Google"}
          </button>

          <p className="text-center text-sm mt-6" style={{ color: "#888" }}>
            Pas encore de compte ?{" "}
            <Link href="/inscription" style={{ color: "var(--primaire-clair)", textDecoration: "none" }}
              className="font-medium hover:underline">
              S'inscrire
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
