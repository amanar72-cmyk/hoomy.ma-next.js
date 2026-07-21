"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";
import { validerMotDePasse, LONGUEUR_MIN } from "@/lib/securite/motDePasse";
import CriteresMotDePasse from "@/components/auth/CriteresMotDePasse";

type Indicateur = { code: string; pays: string; drapeau: string };

const INDICATEURS: Indicateur[] = [
  { code: "+212", pays: "Maroc",               drapeau: "🇲🇦" },
  { code: "+213", pays: "Algérie",             drapeau: "🇩🇿" },
  { code: "+216", pays: "Tunisie",             drapeau: "🇹🇳" },
  { code: "+33",  pays: "France",              drapeau: "🇫🇷" },
  { code: "+32",  pays: "Belgique",            drapeau: "🇧🇪" },
  { code: "+41",  pays: "Suisse",              drapeau: "🇨🇭" },
  { code: "+34",  pays: "Espagne",             drapeau: "🇪🇸" },
  { code: "+39",  pays: "Italie",              drapeau: "🇮🇹" },
  { code: "+49",  pays: "Allemagne",           drapeau: "🇩🇪" },
  { code: "+44",  pays: "Royaume-Uni",         drapeau: "🇬🇧" },
  { code: "+31",  pays: "Pays-Bas",            drapeau: "🇳🇱" },
  { code: "+351", pays: "Portugal",            drapeau: "🇵🇹" },
  { code: "+966", pays: "Arabie saoudite",     drapeau: "🇸🇦" },
  { code: "+971", pays: "Émirats arabes unis", drapeau: "🇦🇪" },
  { code: "+974", pays: "Qatar",               drapeau: "🇶🇦" },
  { code: "+965", pays: "Koweït",              drapeau: "🇰🇼" },
  { code: "+1",   pays: "États-Unis / Canada", drapeau: "🇺🇸" },
];

export default function FormulaireInscription() {
  const router = useRouter();
  const [nomComplet, setNomComplet] = useState("");
  const [email, setEmail] = useState("");
  const [indicateur, setIndicateur] = useState<Indicateur>(INDICATEURS[0]);
  const [numero, setNumero] = useState("");
  const [dropdownOuvert, setDropdownOuvert] = useState(false);
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [chargement, setChargement] = useState(false);
  const [chargementGoogle, setChargementGoogle] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown si clic en dehors
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOuvert(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function creerCompte() {
    if (!nomComplet.trim()) { setErreur("Le nom complet est requis."); return; }
    if (!email.includes("@")) { setErreur("Adresse email invalide."); return; }
    if (!numero.trim()) { setErreur("Le numéro de téléphone est requis."); return; }
    const faiblesse = validerMotDePasse(motDePasse);
    if (faiblesse) { setErreur(faiblesse); return; }
    if (motDePasse !== confirmation) { setErreur("Les mots de passe ne correspondent pas."); return; }

    setErreur(null);
    setChargement(true);

    // Numéro complet : indicatif + numéro local (on retire le 0 initial si présent)
    const telephoneComplet = `${indicateur.code}${numero.trim().replace(/^0/, "")}`;

    try {
      const supabase = createClient();
      const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const { error, data } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: motDePasse,
        options: {
          data: { nom_complet: nomComplet.trim(), telephone: telephoneComplet },
          // Le lien de confirmation redirige vers /auth/callback pour établir la session
          emailRedirectTo: `${base}/auth/callback?next=/mon-compte`,
        },
      });

      if (error) {
        const msg = error.message ?? "";
        if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("user already registered")) {
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

      // Email déjà utilisé + confirmation email activée → Supabase retourne identities = []
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

  async function seConnecterGoogle() {
    setErreur(null);
    setChargementGoogle(true);
    try {
      const supabase = createClient();
      const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${base}/auth/callback?next=/mon-compte` },
      });
      if (error) {
        setErreur(`Connexion Google impossible : ${error.message}`);
        setChargementGoogle(false);
      }
    } catch {
      setErreur("Erreur inattendue — réessayez.");
      setChargementGoogle(false);
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
            {/* Nom */}
            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: "#555" }}>
                Nom complet
              </label>
              <input type="text" value={nomComplet} onChange={(e) => setNomComplet(e.target.value)}
                autoComplete="name" placeholder="Mohammed Alami"
                className="w-full border rounded-xl px-4 py-3 text-sm" style={inp} />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: "#555" }}>
                Adresse email
              </label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="email" placeholder="vous@exemple.com"
                className="w-full border rounded-xl px-4 py-3 text-sm" style={inp} />
            </div>

            {/* Téléphone avec sélecteur d'indicatif */}
            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: "#555" }}>
                Téléphone <span style={{ color: "var(--erreur)", fontSize: 11 }}>*</span>
              </label>
              <div className="relative" ref={dropdownRef}>
                {/* Champ combiné */}
                <div className="flex border rounded-xl overflow-hidden"
                  style={{ borderColor: "var(--bordure-chaude)", background: "var(--fond-secondaire)" }}>

                  {/* Bouton indicatif */}
                  <button
                    type="button"
                    onClick={() => setDropdownOuvert((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-3 cursor-pointer shrink-0 hover:opacity-80 transition-opacity"
                    style={{ borderRight: "1px solid var(--bordure-chaude)", background: "transparent" }}
                  >
                    <span className="text-base leading-none">{indicateur.drapeau}</span>
                    <span className="text-sm font-medium" style={{ color: "var(--primaire)" }}>
                      {indicateur.code}
                    </span>
                    <svg
                      width="10" height="10" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5"
                      style={{
                        color: "var(--texte-tertiaire)",
                        transform: dropdownOuvert ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.15s",
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {/* Input numéro */}
                  <input
                    type="tel"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    autoComplete="tel-national"
                    placeholder="6 12 34 56 78"
                    className="flex-1 px-3 py-3 text-sm focus:outline-none min-w-0"
                    style={{ background: "transparent", color: "var(--primaire)" }}
                  />
                </div>

                {/* Dropdown liste des pays */}
                {dropdownOuvert && (
                  <div
                    className="absolute left-0 top-full mt-1 w-full z-30 rounded-xl border overflow-hidden"
                    style={{
                      background: "var(--fond-secondaire)",
                      borderColor: "var(--bordure-chaude)",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                      maxHeight: 240,
                      overflowY: "auto",
                    }}
                  >
                    {INDICATEURS.map((ind) => (
                      <button
                        key={ind.code + ind.pays}
                        type="button"
                        onClick={() => {
                          setIndicateur(ind);
                          setDropdownOuvert(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left cursor-pointer hover:opacity-80 transition-opacity"
                        style={{
                          background: indicateur.code === ind.code && indicateur.pays === ind.pays
                            ? "var(--fond-primaire, #f0f7f4)"
                            : "transparent",
                          color: "var(--primaire)",
                        }}
                      >
                        <span className="text-base w-6 text-center leading-none">{ind.drapeau}</span>
                        <span className="flex-1">{ind.pays}</span>
                        <span className="font-medium tabular-nums" style={{ color: "var(--texte-tertiaire)" }}>
                          {ind.code}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: "#555" }}>
                Mot de passe{" "}
                <span style={{ color: "#B4AD97", fontWeight: 400 }}>(min. {LONGUEUR_MIN} caractères)</span>
              </label>
              <input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)}
                autoComplete="new-password" placeholder="••••••••"
                className="w-full border rounded-xl px-4 py-3 text-sm" style={inp} />
              <CriteresMotDePasse motDePasse={motDePasse} />
            </div>

            {/* Confirmation */}
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
              style={{ background: "var(--accent)", color: "var(--texte-sur-accent)" }}>
              {chargement ? "Création en cours…" : "Créer mon compte"}
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
