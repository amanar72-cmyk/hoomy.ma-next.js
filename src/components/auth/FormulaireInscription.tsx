"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";
import { emailTechniqueDepuisTelephone } from "@/lib/auth/telephone";

// SSR: false obligatoire — react-phone-number-input crashe l'hydratation
const PhoneInput = dynamic(() => import("@/components/admin/ChampTelephone"), {
  ssr: false,
  loading: () => (
    <input type="tel" placeholder="+212 6XX XXX XXX"
      className="w-full border rounded-xl px-4 py-3 text-sm"
      style={{ borderColor: "var(--bordure-chaude)", color: "var(--primaire)", background: "var(--fond-secondaire)" }} />
  ),
});

export default function FormulaireInscription() {
  const router = useRouter();
  const [nomComplet, setNomComplet] = useState("");
  const [telephone, setTelephone] = useState("");
  const [emailContact, setEmailContact] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [afficherMdp, setAfficherMdp] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  async function creerCompte() {
    if (!nomComplet.trim()) { setErreur("Le nom complet est requis."); return; }
    if (!telephone) { setErreur("Le numéro de téléphone est requis."); return; }
    if (motDePasse.length < 6) { setErreur("Mot de passe trop court (min. 6 caractères)."); return; }
    if (motDePasse !== confirmation) { setErreur("Les mots de passe ne correspondent pas."); return; }
    if (emailContact && !emailContact.includes("@")) { setErreur("Adresse email invalide."); return; }

    setErreur(null);
    setChargement(true);

    try {
      const supabase = createClient();
      // Email technique dérivé du téléphone — l'utilisateur ne le voit jamais
      const emailTechnique = emailTechniqueDepuisTelephone(telephone);

      const { error, data } = await supabase.auth.signUp({
        email: emailTechnique,
        password: motDePasse,
        options: { data: { nom_complet: nomComplet.trim() } },
      });

      if (error) {
        if (error.message.toLowerCase().includes("already registered")) {
          setErreur("Ce numéro est déjà associé à un compte. Connectez-vous.");
        } else {
          setErreur(`Erreur : ${error.message}`);
        }
        setChargement(false);
        return;
      }

      // Stocke le vrai email dans profils.email_contact si fourni
      if (data.user && emailContact.trim()) {
        await supabase
          .from("profils")
          .update({ email_contact: emailContact.trim().toLowerCase() })
          .eq("id", data.user.id);
      }

      if (!data.session) {
        setSucces(true);
        setChargement(false);
        return;
      }

      router.push("/mon-compte");
      router.refresh();
    } catch {
      setErreur("Erreur inattendue — réessayez.");
      setChargement(false);
    }
  }

  const inp: React.CSSProperties = {
    borderColor: "var(--bordure-chaude)",
    color: "var(--primaire)",
    background: "var(--fond-secondaire)",
  };

  if (succes) {
    return (
      <main
        className="min-h-screen flex items-center justify-center px-4 py-12"
        style={{ background: "linear-gradient(160deg,#f0f7f4 0%,#FAF7F0 60%,#f5efe3 100%)" }}
      >
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-8"><Logo size={40} /></div>
          <div
            className="rounded-2xl p-10"
            style={{ background: "var(--fond-secondaire)", boxShadow: "0 4px 32px rgba(15,76,58,0.10)" }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: "rgba(15,76,58,0.1)" }}
            >
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="var(--primaire)" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h2
              className="text-2xl font-normal mb-3"
              style={{ fontFamily: "var(--font-marcellus),serif", color: "var(--primaire)" }}
            >
              Compte créé
            </h2>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--texte-chaud)" }}>
              Votre compte HOOMY.MA a été créé avec succès.
            </p>
            <Link
              href="/connexion"
              className="text-sm font-medium hover:underline"
              style={{ color: "var(--primaire-clair)", textDecoration: "none" }}
            >
              Se connecter
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(160deg,#f0f7f4 0%,#FAF7F0 60%,#f5efe3 100%)" }}
    >
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/" style={{ textDecoration: "none" }}>
            <Logo size={40} />
          </Link>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{ background: "var(--fond-secondaire)", boxShadow: "0 4px 32px rgba(15,76,58,0.10)" }}
        >
          <h1
            className="text-2xl font-normal mb-1 text-center"
            style={{ fontFamily: "var(--font-marcellus),serif", color: "var(--primaire)" }}
          >
            Créer un compte
          </h1>
          <p className="text-sm text-center mb-7" style={{ color: "var(--texte-tertiaire)" }}>
            HOOMY.MA · Gratuit
          </p>

          {erreur && (
            <div
              className="mb-5 px-4 py-3 rounded-lg text-sm border"
              style={{ background: "#FEF2F2", color: "var(--erreur-texte)", borderColor: "#FECACA" }}
            >
              {erreur}
            </div>
          )}

          <div className="flex flex-col gap-4">
            {/* Nom complet */}
            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: "#555" }}>
                Nom complet
              </label>
              <input
                type="text"
                value={nomComplet}
                onChange={(e) => setNomComplet(e.target.value)}
                autoComplete="name"
                placeholder="Mohammed Alami"
                className="w-full border rounded-xl px-4 py-3 text-sm"
                style={inp}
              />
            </div>

            {/* Téléphone — identifiant principal */}
            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: "#555" }}>
                Numéro de téléphone
                <span className="ml-1 font-normal" style={{ color: "#B4AD97" }}>(identifiant)</span>
              </label>
              <PhoneInput
                value={telephone}
                onChange={(v) => setTelephone(v ?? "")}
                defaultCountry="MA"
                placeholder="+212 6XX XXX XXX"
                className="phone-input-hoomy"
              />
            </div>

            {/* Email contact — facultatif */}
            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: "#555" }}>
                Adresse email
                <span className="ml-1 font-normal" style={{ color: "#B4AD97" }}>(facultatif)</span>
              </label>
              <input
                type="email"
                value={emailContact}
                onChange={(e) => setEmailContact(e.target.value)}
                autoComplete="email"
                placeholder="vous@exemple.com"
                className="w-full border rounded-xl px-4 py-3 text-sm"
                style={inp}
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: "#555" }}>
                Mot de passe{" "}
                <span style={{ color: "#B4AD97", fontWeight: 400 }}>(min. 6 caractères)</span>
              </label>
              <div className="relative">
                <input
                  type={afficherMdp ? "text" : "password"}
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full border rounded-xl px-4 py-3 text-sm pr-11"
                  style={inp}
                />
                <button
                  type="button"
                  onClick={() => setAfficherMdp((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ color: "var(--texte-tertiaire)" }}
                >
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    {afficherMdp ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Confirmation */}
            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: "#555" }}>
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full border rounded-xl px-4 py-3 text-sm"
                style={{
                  ...inp,
                  borderColor:
                    confirmation && confirmation !== motDePasse ? "#FECACA" : "var(--bordure-chaude)",
                }}
              />
              {confirmation && confirmation !== motDePasse && (
                <p className="text-xs mt-1" style={{ color: "var(--erreur)" }}>
                  Les mots de passe ne correspondent pas.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={creerCompte}
              disabled={chargement}
              className="w-full py-3 rounded-xl text-sm font-semibold hover:opacity-90 mt-1 cursor-pointer disabled:opacity-60"
              style={{ background: "var(--accent)", color: "var(--primaire)" }}
            >
              {chargement ? "Création en cours…" : "Créer mon compte"}
            </button>

            <p className="text-xs text-center leading-relaxed" style={{ color: "#999" }}>
              En créant un compte, vous acceptez nos{" "}
              <Link href="/cgu" className="hover:underline" style={{ color: "var(--primaire-clair)", textDecoration: "none" }}>
                conditions d'utilisation
              </Link>
              .
            </p>
          </div>

          <p className="text-center text-sm mt-6" style={{ color: "#888" }}>
            Déjà un compte ?{" "}
            <Link
              href="/connexion"
              style={{ color: "var(--primaire-clair)", textDecoration: "none" }}
              className="font-medium hover:underline"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
