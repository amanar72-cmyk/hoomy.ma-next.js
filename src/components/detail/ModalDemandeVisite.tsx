"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { trackEvenement } from "@/lib/tracking/track";
import { soumettreDemandeVisite } from "@/app/detail/actions";

type Props = {
  bienId: string;
  agentId: string | null;
  titreBien: string;
  onClose: () => void;
};

export default function ModalDemandeVisite({ bienId, agentId, titreBien, onClose }: Props) {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [date, setDate] = useState("");
  const [creneau, setCreneau] = useState("matin");
  const [message, setMessage] = useState("");
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
      if (user.email) setEmail(user.email);
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
    if (!nom.trim() || !email.trim() || !telephone.trim() || !date) {
      setErreur("Nom, email, téléphone et date sont requis.");
      return;
    }

    setErreur(null);
    setChargement(true);

    const libelleCreneau: Record<string, string> = {
      matin: "Matin (9h–12h)",
      "apres-midi": "Après-midi (14h–18h)",
      soir: "Soir (18h–20h)",
    };
    const messageComplet = [
      `Créneau souhaité : ${libelleCreneau[creneau]}`,
      message.trim(),
    ].filter(Boolean).join("\n");

    try {
      await soumettreDemandeVisite({
        bienId,
        agentId,
        titreBien,
        nomClient: nom.trim(),
        emailClient: email.trim(),
        telephoneClient: telephone.trim(),
        dateSouhaitee: date,
        message: messageComplet || null,
        siteWeb,
      });
    } catch {
      setErreur("Une erreur est survenue. Veuillez réessayer.");
      setChargement(false);
      return;
    }

    setSucces(true);
    setChargement(false);
    void trackEvenement(bienId, "contact");
  }

  const today = new Date().toISOString().split("T")[0];
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
              Demander une visite
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
                Votre demande de visite a été envoyée, un conseiller vous recontactera sous 24h.
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
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              placeholder="Votre nom complet *"
              className={cls}
              style={inp}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Votre email *"
              className={cls}
              style={inp}
            />
            <input
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              required
              placeholder="Votre téléphone *"
              className={cls}
              style={inp}
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: "var(--texte-tertiaire)" }}>Date souhaitée *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  min={today}
                  className={cls}
                  style={inp}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: "var(--texte-tertiaire)" }}>Créneau</label>
                <select
                  value={creneau}
                  onChange={(e) => setCreneau(e.target.value)}
                  className={cls}
                  style={inp}
                >
                  <option value="matin">Matin (9h–12h)</option>
                  <option value="apres-midi">Après-midi (14h–18h)</option>
                  <option value="soir">Soir (18h–20h)</option>
                </select>
              </div>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Message (facultatif)"
              className={cls}
              style={{ ...inp, resize: "none" }}
            />

            <button
              type="submit"
              disabled={chargement}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity cursor-pointer disabled:opacity-60 hover:opacity-90 mt-1"
              style={{ background: "var(--primaire)", color: "var(--fond-secondaire)" }}
            >
              {chargement ? "Envoi en cours…" : "Envoyer ma demande"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
