"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { journaliserConnexion } from "@/lib/securite/journalConnexion";
import BarreEtatNative from "@/components/mobile/BarreEtatNative";

const ROLES_PRO = ["admin", "agent", "agence"];

export default function FormulaireConnexionPro() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [afficherMdp, setAfficherMdp] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [tenteEnvoi, setTenteEnvoi] = useState(false);

  async function seConnecter() {
    setTenteEnvoi(true);
    if (!email || !motDePasse) {
      setErreur("Veuillez remplir tous les champs.");
      return;
    }
    setErreur(null);
    setChargement(true);
    try {
      const supabase = createClient();
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: motDePasse,
      });

      if (error) {
        journaliserConnexion({ email: email.trim().toLowerCase(), methode: "pro", resultat: "echec", motif: error.message });
        setErreur("Email ou mot de passe incorrect.");
        setChargement(false);
        return;
      }

      if (authData.user) {
        const { data: profil } = await supabase
          .from("profils")
          .select("role")
          .eq("id", authData.user.id)
          .single();

        const role = profil?.role ?? "";

        if (!ROLES_PRO.includes(role)) {
          journaliserConnexion({ email: email.trim().toLowerCase(), methode: "pro", resultat: "echec", motif: "role non autorise (espace pro)" });
          await supabase.auth.signOut();
          setErreur("Accès réservé aux agents et administrateurs HOOMY. Connectez-vous sur hoomy.ma pour votre espace client.");
          setChargement(false);
          return;
        }

        journaliserConnexion({ email: email.trim().toLowerCase(), methode: "pro", resultat: "succes" });
        // Agents : arrivée directe sur leurs biens (le tableau de bord reste
        // accessible via la sidebar)
        const destination = role === "admin" ? "/admin" : "/pro/biens";
        router.push(destination);
        router.refresh();
      }
    } catch {
      setErreur("Erreur inattendue — réessayez.");
      setChargement(false);
    }
  }

  const inp: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 10,
    border: "1px solid #E0E0E0",
    fontSize: 14,
    color: "#111",
    background: "#FAFAFA",
    outline: "none",
    transition: "border-color 0.18s",
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "#F5F5F5" }}
    >
      {/* Le formulaire est sur fond clair : sans cela, l'application mobile
          garderait les icônes blanches réglées pour le back-office. */}
      <BarreEtatNative fond="clair" />

      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <p style={{
            fontFamily: "var(--font-marcellus),serif",
            fontSize: 26,
            letterSpacing: 2,
            color: "#111",
            lineHeight: 1,
          }}>
            HOOMY
          </p>
          <span
            className="inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full tracking-widest"
            style={{ background: "#D4AF37", color: "#111", letterSpacing: 2 }}
          >
            ESPACE PRO
          </span>
        </div>

        {/* Carte */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "#fff",
            border: "1px solid #E8E8E8",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          }}
        >
          <h1
            className="text-base font-semibold mb-7 text-center"
            style={{ color: "#111" }}
          >
            Connexion
          </h1>

          {erreur && (
            <div
              className="mb-5 px-4 py-3 rounded-xl text-xs border"
              style={{ background: "#FEF2F2", color: "#991B1B", borderColor: "#FECACA", lineHeight: 1.5 }}
            >
              {erreur}
            </div>
          )}

          <div className="flex flex-col gap-4">

            {/* Email */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: tenteEnvoi && !email ? "#DC2626" : "#444" }}>
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="vous@exemple.com"
                style={inp}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#111"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#E0E0E0"; }}
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: tenteEnvoi && !motDePasse ? "#DC2626" : "#444" }}>
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={afficherMdp ? "text" : "password"}
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && seConnecter()}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  style={{ ...inp, paddingRight: 42 }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#111"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#E0E0E0"; }}
                />
                <button
                  type="button"
                  onClick={() => setAfficherMdp((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ color: "#999" }}
                >
                  <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    {afficherMdp ? (
                      <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>
                    ) : (
                      <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Bouton connexion */}
            <button
              type="button"
              onClick={seConnecter}
              disabled={chargement}
              className="w-full py-3 rounded-xl text-sm font-semibold mt-1 cursor-pointer disabled:opacity-50"
              style={{
                background: chargement ? "#444" : "#111",
                color: "#fff",
                border: "none",
                transition: "background 0.18s",
                letterSpacing: 0.3,
              }}
            >
              {chargement ? "Connexion…" : "Se connecter"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
