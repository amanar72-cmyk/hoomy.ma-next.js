"use client";

// Petite fenêtre « Demander à être recontacté » — remplace l'envoi de message
// sur la fiche bien. Le visiteur laisse prénom, nom et téléphone (obligatoire) ;
// la demande part comme LEAD directement chez le conseiller du bien, et
// l'administrateur la reçoit aussi pour suivre l'activité des conseillers.

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { demanderRappel } from "@/app/detail/actions";

type Props = {
  bienId: string;
  titreBien: string;
  onClose: () => void;
};

export default function ModalDemandeRappel({ bienId, titreBien, onClose }: Props) {
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [siteWeb, setSiteWeb] = useState(""); // honeypot — invisible pour les humains
  const [chargement, setChargement] = useState(false);
  const [succes, setSucces] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Pré-remplir si l'utilisateur est connecté
  useEffect(() => {
    async function chargerProfil() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profil } = await supabase
        .from("profils")
        .select("nom_complet, telephone")
        .eq("id", user.id)
        .single();
      if (profil?.nom_complet) setNom(profil.nom_complet);
      if (profil?.telephone) setTelephone(profil.telephone);
    }
    chargerProfil();
  }, []);

  // Fermer avec Échap
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim() || !telephone.trim()) {
      setErreur("Votre nom et votre numéro de téléphone sont requis.");
      return;
    }

    setErreur(null);
    setChargement(true);

    try {
      await demanderRappel({
        bienId,
        nom: nom.trim(),
        prenom: prenom.trim() || null,
        telephone: telephone.trim(),
        siteWeb,
      });
    } catch (err) {
      setErreur(
        err instanceof Error && err.message.includes("téléphone")
          ? "Numéro de téléphone invalide — vérifiez le format (ex. 06 12 34 56 78)."
          : "Une erreur est survenue. Veuillez réessayer."
      );
      setChargement(false);
      return;
    }

    setSucces(true);
    setChargement(false);
  }

  const inp = { borderColor: "var(--bordure-chaude)", color: "var(--texte-principal)", background: "var(--fond-secondaire)" };
  const cls = "border rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(15,30,20,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "var(--fond-secondaire)", boxShadow: "0 24px 64px rgba(15,76,58,0.25)" }}
      >
        {/* ── En-tête ─────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid #F0EDE5" }}
        >
          <div>
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--primaire)", fontFamily: "var(--font-marcellus),serif" }}
            >
              Demander à être recontacté
            </h2>
            <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--texte-tertiaire)" }}>
              {titreBien}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {succes ? (
          /* ── Confirmation ───────────────────────────────────────────────── */
          <div className="px-6 py-12 flex flex-col items-center text-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "var(--succes-fond)" }}
            >
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="var(--succes-texte)" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold mb-2" style={{ color: "var(--primaire)" }}>
                Demande envoyée !
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--texte-tertiaire)" }}>
                Votre conseiller HOOMY vous rappellera très vite au{" "}
                <strong style={{ color: "var(--primaire)" }}>{telephone}</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 px-6 py-2.5 rounded-xl text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity"
              style={{ background: "var(--primaire)", color: "var(--fond-secondaire)" }}
            >
              Fermer
            </button>
          </div>
        ) : (
          /* ── Formulaire ─────────────────────────────────────────────────── */
          <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-3">
            <p className="text-sm leading-relaxed" style={{ color: "var(--texte-tertiaire)" }}>
              Laissez vos coordonnées — un conseiller HOOMY vous rappelle au sujet de ce bien.
            </p>

            {erreur && (
              <div
                className="px-4 py-2.5 rounded-xl text-sm"
                style={{ background: "var(--erreur-fond)", color: "var(--erreur-texte)" }}
              >
                {erreur}
              </div>
            )}

            {/* Honeypot anti-bot — invisible pour les humains, les bots le remplissent */}
            <input
              type="text"
              value={siteWeb}
              onChange={(e) => setSiteWeb(e.target.value)}
              autoComplete="off"
              tabIndex={-1}
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
            />
            <div className="flex gap-3">
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Prénom"
                autoComplete="given-name"
                className={cls}
                style={inp}
              />
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                placeholder="Nom *"
                autoComplete="family-name"
                className={cls}
                style={inp}
              />
            </div>
            <input
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              required
              placeholder="Votre téléphone * (ex. 06 12 34 56 78)"
              autoComplete="tel"
              className={cls}
              style={inp}
            />

            <button
              type="submit"
              disabled={chargement}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity cursor-pointer disabled:opacity-60 hover:opacity-90 mt-1"
              style={{ background: "var(--primaire)", color: "var(--fond-secondaire)" }}
            >
              {chargement ? "Envoi en cours…" : "Être recontacté"}
            </button>

            <p className="text-xs text-center" style={{ color: "var(--texte-tertiaire)" }}>
              Vos coordonnées ne sont utilisées que pour vous rappeler au sujet de ce bien.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
