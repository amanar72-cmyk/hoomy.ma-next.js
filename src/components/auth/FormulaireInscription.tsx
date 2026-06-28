"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

export default function FormulaireInscription() {
  const router = useRouter();
  const [nomComplet, setNomComplet] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  async function creerCompte() {
    if (!nomComplet.trim()) { setErreur("Le nom complet est requis."); return; }
    if (!email.includes("@")) { setErreur("Adresse email invalide."); return; }
    if (!telephone.trim()) { setErreur("Le numéro de téléphone est requis."); return; }
    if (motDePasse.length < 6) { setErreur("Mot de passe trop court (min. 6 caractères)."); return; }
    if (motDePasse !== confirmation) { setErreur("Les mots de passe ne correspondent pas."); return; }

    setErreur(null);
    setChargement(true);

    try {
      const supabase = createClient();
      const { error, data } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: motDePasse,
        options: {
          data: { nom_complet: nomComplet.trim(), telephone: telephone.trim() },
        },
      });

      if (error) {
        const msg = error.message ?? "";
        if (
          msg.toLowerCase().includes("already registered") ||
          msg.toLowerCase().includes("user already registered")
        ) {
          setErreur("Cette adresse email est déjà utilisée. Connectez-vous ou réinitialisez votre mot de passe.");
        } else if (msg.toLowerCase().includes("password")) {
          setErreur("Mot de passe invalide — utilisez au moins 6 caractères.");
        } else if (msg.toLowerCase().includes("email")) {
          setErreur("Adresse email invalide ou non acceptée.");
        } else if (msg.toLowerCase().includes("rate limit")) {
          setErreur("Trop de tentatives — réessayez dans quelques minutes.");
        } else {
          setErreur(msg || "Une erreur est survenue. Veuillez réessayer.");
        }
        setChargement(false);
        return;
      }

      // Cas Supabase : email déjà utilisé + confirmation email activée.
      // Supabase ne renvoie pas d'erreur mais retourne identities = [].
      if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
        setErreur("Cette adresse email est déjà utilisée. Connectez-vous ou réinitialisez votre mot de passe.");
        setChargement(false);
        return;
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
      <main className="min-h-screen flex items-center justify-center px-4 py-12"
        style={{ background: "linear-gradient(160deg,#f0f7f4 0%,#FAF7F0 60%,#f5efe3 100%)" }}>
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-8"><Logo size={40} /></div>
          <div className="rounded-2xl p-10"
            style={{ background: "var(--fond-secondaire)", boxShadow: "0 4px 32px rgba(15,76,58,0.10)" }}>
            <div className="text-5xl mb-5">📬</div>
            <h2 className="text-2xl font-normal mb-3"
              style={{ fontFamily: "var(--font-marcellus),serif", color: "var(--primaire)" }}>
              Vérifiez votre email
            </h2>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--texte-chaud)" }}>
              Un lien de confirmation a été envoyé à{" "}
              <strong style={{ color: "var(--primaire)" }}>{email}</strong>.
              Cliquez dessus pour activer votre compte.
            </p>
            <Link href="/connexion" className="text-sm font-medium hover:underline"
              style={{ color: "var(--primaire-clair)", textDecoration: "none" }}>
              Retour à la connexion
            </Link>
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
            Créer un compte
          </h1>
          <p className="text-sm text-center mb-7" style={{ color: "var(--texte-tertiaire)" }}>
            HOOMY.MA · Gratuit
          </p>

          {erreur && (
            <div className="mb-5 px-4 py-3 rounded-lg text-sm"
              style={{ background: "var(--erreur-fond)", color: "var(--erreur-texte)", border: "1px solid var(--erreur)" }}>
              {erreur}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: "#555" }}>
                Nom complet
              </label>
              <input type="text" value={nomComplet} onChange={(e) => setNomComplet(e.target.value)}
                autoComplete="name" placeholder="Mohammed Alami"
                className="w-full border rounded-xl px-4 py-3 text-sm" style={inp} />
            </div>

            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: "#555" }}>
                Adresse email
              </label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="email" placeholder="vous@exemple.com"
                className="w-full border rounded-xl px-4 py-3 text-sm" style={inp} />
            </div>

            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: "#555" }}>
                Téléphone
              </label>
              <input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)}
                autoComplete="tel" placeholder="06 12 34 56 78"
                className="w-full border rounded-xl px-4 py-3 text-sm" style={inp} />
            </div>

            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: "#555" }}>
                Mot de passe{" "}
                <span style={{ color: "#B4AD97", fontWeight: 400 }}>(min. 6 caractères)</span>
              </label>
              <input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)}
                autoComplete="new-password" placeholder="••••••••"
                className="w-full border rounded-xl px-4 py-3 text-sm" style={inp} />
            </div>

            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: "#555" }}>
                Confirmer le mot de passe
              </label>
              <input type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)}
                autoComplete="new-password" placeholder="••••••••"
                className="w-full border rounded-xl px-4 py-3 text-sm"
                style={{ ...inp, borderColor: confirmation && confirmation !== motDePasse ? "#FECACA" : "var(--bordure-chaude)" }} />
              {confirmation && confirmation !== motDePasse && (
                <p className="text-xs mt-1" style={{ color: "var(--erreur)" }}>
                  Les mots de passe ne correspondent pas.
                </p>
              )}
            </div>

            <button type="button" onClick={creerCompte} disabled={chargement}
              className="w-full py-3 rounded-xl text-sm font-semibold hover:opacity-90 mt-1 cursor-pointer disabled:opacity-60"
              style={{ background: "var(--accent)", color: "var(--primaire)" }}>
              {chargement ? "Création en cours…" : "Créer mon compte"}
            </button>
          </div>

          <p className="text-center text-sm mt-6" style={{ color: "#888" }}>
            Déjà un compte ?{" "}
            <Link href="/connexion" style={{ color: "var(--primaire-clair)", textDecoration: "none" }}
              className="font-medium hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
