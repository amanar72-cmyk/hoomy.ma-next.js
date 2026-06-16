"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

export default function FormulaireInscription() {
  console.log("[INSCRIPTION] render");

  const router = useRouter();
  const [nomComplet, setNomComplet] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  useEffect(() => {
    console.log("[INSCRIPTION] useEffect = hydratation OK ✅");
  }, []);

  async function creerCompte() {
    console.log("[INSCRIPTION] 1. clic Créer mon compte");

    if (!nomComplet.trim()) { setErreur("Le nom complet est requis."); return; }
    if (!email.includes("@")) { setErreur("Adresse email invalide."); return; }
    if (motDePasse.length < 6) { setErreur("Mot de passe trop court (min. 6 caractères)."); return; }
    if (motDePasse !== confirmation) { setErreur("Les mots de passe ne correspondent pas."); return; }

    setErreur(null);
    setChargement(true);

    try {
      console.log("[INSCRIPTION] 2. URL Supabase:", process.env.NEXT_PUBLIC_SUPABASE_URL);
      const supabase = createClient();
      const { error, data } = await supabase.auth.signUp({
        email: email.trim(),
        password: motDePasse,
        options: { data: { nom_complet: nomComplet.trim() } },
      });
      console.log("[INSCRIPTION] 3. résultat:", error?.message ?? "OK", "session:", !!data?.session);

      if (error) {
        setErreur(`Erreur : ${error.message}`);
        setChargement(false);
        return;
      }

      // Confirmation email requise
      if (!data.session) {
        setSucces(true);
        setChargement(false);
        return;
      }

      // Connexion immédiate (email confirmation désactivé)
      router.push("/mon-compte");
      router.refresh();
    } catch (ex) {
      console.error("[INSCRIPTION] exception:", ex);
      setErreur("Erreur inattendue — consultez la console.");
      setChargement(false);
    }
  }

  const inp: React.CSSProperties = { borderColor: "#E0DAC8", color: "#0F4C3A", background: "#fff" };

  if (succes) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12"
        style={{ background: "linear-gradient(160deg,#f0f7f4 0%,#FAF7F0 60%,#f5efe3 100%)" }}>
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-8"><Logo size={40} /></div>
          <div className="rounded-2xl p-10"
            style={{ background: "#fff", boxShadow: "0 4px 32px rgba(15,76,58,0.10)" }}>
            <div className="text-5xl mb-5">📬</div>
            <h2 className="text-2xl font-normal mb-3"
              style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
              Vérifiez votre email
            </h2>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "#6B6450" }}>
              Un lien de confirmation a été envoyé à{" "}
              <strong style={{ color: "#0F4C3A" }}>{email}</strong>.
              Cliquez dessus pour activer votre compte.
            </p>
            <Link href="/connexion" className="text-sm font-medium hover:underline"
              style={{ color: "#146C43", textDecoration: "none" }}>
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
          style={{ background: "#fff", boxShadow: "0 4px 32px rgba(15,76,58,0.10)" }}>
          <h1 className="text-2xl font-normal mb-1 text-center"
            style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
            Créer un compte
          </h1>
          <p className="text-sm text-center mb-7" style={{ color: "#9DB8AD" }}>
            HOOMY.MA · Gratuit
          </p>

          {erreur && (
            <div className="mb-5 px-4 py-3 rounded-lg text-sm border"
              style={{ background: "#FEF2F2", color: "#991B1B", borderColor: "#FECACA" }}>
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
                Mot de passe <span style={{ color: "#B4AD97", fontWeight: 400 }}>(min. 6 caractères)</span>
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
                style={{ ...inp, borderColor: confirmation && confirmation !== motDePasse ? "#FECACA" : "#E0DAC8" }} />
              {confirmation && confirmation !== motDePasse && (
                <p className="text-xs mt-1" style={{ color: "#DC2626" }}>
                  Les mots de passe ne correspondent pas.
                </p>
              )}
            </div>

            <button type="button" onClick={creerCompte} disabled={chargement}
              className="w-full py-3 rounded-xl text-sm font-semibold hover:opacity-90 mt-1 cursor-pointer disabled:opacity-60"
              style={{ background: "#D4AF37", color: "#0F4C3A" }}>
              {chargement ? "Création en cours…" : "Créer mon compte"}
            </button>
          </div>

          <p className="text-center text-sm mt-6" style={{ color: "#888" }}>
            Déjà un compte ?{" "}
            <Link href="/connexion" style={{ color: "#146C43", textDecoration: "none" }}
              className="font-medium hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
