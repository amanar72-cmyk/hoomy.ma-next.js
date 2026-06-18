"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// ─── Message d'accueil (UI uniquement, non envoyé à l'API) ───────────────────

const MSG_ACCUEIL: Message = {
  id: "accueil",
  role: "assistant",
  content:
    "Bonjour ! Je suis l'assistant HOOMY 🏠\nComment puis-je vous aider dans votre projet immobilier ?\n\n💬 Je parle : Français · العربية · الدارجة · English",
};

const LIMITE_MSG_UTILISATEUR = 10; // 10 échanges ≈ 20 messages total

// ─── Icônes SVG inline ────────────────────────────────────────────────────────

function IcChat({ taille = 24 }: { taille?: number }) {
  return (
    <svg
      width={taille}
      height={taille}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 10h.01M12 10h.01M16 10h.01" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function IcFermer() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IcEnvoyer() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

// ─── Indicateur "en train d'écrire" ──────────────────────────────────────────

function IndicateurTyping() {
  return (
    <div className="flex items-start gap-2.5">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: "#0F4C3A" }}
      >
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </div>
      <div
        className="rounded-2xl rounded-bl-sm px-4 py-3"
        style={{ background: "#F5F1E8", border: "1px solid #EDE7D7" }}
      >
        <div className="flex gap-1.5 items-center h-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full motion-safe:animate-bounce"
              style={{
                background: "#9DB8AD",
                animationDelay: `${i * 160}ms`,
                animationDuration: "0.9s",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Bulle de message individuelle ───────────────────────────────────────────

function BulleMessage({ message }: { message: Message }) {
  const estUtilisateur = message.role === "user";

  if (estUtilisateur) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[82%] rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
          style={{ background: "#0F4C3A", color: "#fff" }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: "#0F4C3A" }}
      >
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </div>
      <div
        className="max-w-[82%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
        style={{ background: "#F5F1E8", border: "1px solid #EDE7D7", color: "#1a2822" }}
      >
        {message.content}
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function BulleChat() {
  const [ouvert, setOuvert] = useState(false);
  const [messages, setMessages] = useState<Message[]>([MSG_ACCUEIL]);
  const [saisie, setSaisie] = useState("");
  const [chargement, setChargement] = useState(false);
  const zoneMsgRef = useRef<HTMLDivElement>(null);
  const champRef = useRef<HTMLInputElement>(null);

  const nbMsgUtilisateur = messages.filter((m) => m.role === "user").length;
  const limiteAtteinte = nbMsgUtilisateur >= LIMITE_MSG_UTILISATEUR;

  // Scroll vers le bas à chaque nouveau message / chargement
  useEffect(() => {
    if (zoneMsgRef.current) {
      zoneMsgRef.current.scrollTop = zoneMsgRef.current.scrollHeight;
    }
  }, [messages, chargement]);

  // Focus sur le champ de saisie à l'ouverture
  useEffect(() => {
    if (ouvert) {
      const timer = setTimeout(() => champRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [ouvert]);

  // Fermeture sur Échap
  useEffect(() => {
    function gererEchap(e: KeyboardEvent) {
      if (e.key === "Escape" && ouvert) setOuvert(false);
    }
    window.addEventListener("keydown", gererEchap);
    return () => window.removeEventListener("keydown", gererEchap);
  }, [ouvert]);

  const envoyerMessage = useCallback(async () => {
    const texte = saisie.trim();
    if (!texte || chargement || limiteAtteinte) return;

    const nouveauMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: texte,
    };

    const historique = [...messages, nouveauMsg];
    setMessages(historique);
    setSaisie("");
    setChargement(true);

    try {
      // L'accueil est UI-only : on l'exclut de l'historique envoyé à l'API
      const msgsPourAPI = historique
        .filter((m) => m.id !== "accueil")
        .map(({ role, content }) => ({ role, content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgsPourAPI }),
      });

      const data = await res.json();

      if (!res.ok || data.erreur) {
        throw new Error(data.erreur ?? "Erreur inconnue");
      }

      setMessages([
        ...historique,
        { id: `a-${Date.now()}`, role: "assistant", content: data.reply },
      ]);
    } catch (err) {
      const msgErreur =
        err instanceof Error && err.message.length < 200
          ? err.message
          : "Je rencontre une difficulté technique. Veuillez réessayer.";

      setMessages([
        ...historique,
        { id: `e-${Date.now()}`, role: "assistant", content: msgErreur },
      ]);
    } finally {
      setChargement(false);
    }
  }, [saisie, chargement, limiteAtteinte, messages]);

  function gererTouche(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      envoyerMessage();
    }
  }

  // ── Rendu ──

  return (
    <>
      {/* ── Fenêtre de chat ── */}
      <div
        role="dialog"
        aria-label="Assistant HOOMY"
        aria-hidden={!ouvert}
        className={[
          "fixed z-[9998]",
          // Mobile : plein écran depuis le bas
          "bottom-0 right-0 w-full rounded-t-2xl",
          // Desktop : fenêtre flottante
          "sm:bottom-6 sm:right-6 sm:w-[380px] sm:rounded-2xl",
          "overflow-hidden flex flex-col",
          "motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out",
          ouvert
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-6 pointer-events-none",
        ].join(" ")}
        style={{
          height: "min(85svh, 560px)",
          boxShadow: "0 25px 60px rgba(15,76,58,0.22), 0 8px 20px rgba(15,76,58,0.12)",
        }}
      >
        {/* En-tête */}
        <header
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #0F4C3A 0%, #146C43 100%)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: "rgba(212,175,55,0.2)",
                border: "1.5px solid rgba(212,175,55,0.45)",
              }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#D4AF37" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div>
              <p
                className="text-sm font-semibold text-white leading-tight"
                style={{ fontFamily: "var(--font-marcellus), serif" }}
              >
                Assistant HOOMY
              </p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.62)" }}>
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 mb-px align-middle"
                  style={{ background: "#4ADE80" }}
                />
                En ligne · Immobilier Maroc
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOuvert(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.1)" }}
            aria-label="Fermer l'assistant"
          >
            <IcFermer />
          </button>
        </header>

        {/* Zone de messages */}
        <div
          ref={zoneMsgRef}
          className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3"
          style={{ background: "#fff" }}
        >
          {messages.map((msg) => (
            <BulleMessage key={msg.id} message={msg} />
          ))}

          {chargement && <IndicateurTyping />}

          {/* Message de limite atteinte */}
          {limiteAtteinte && !chargement && (
            <div
              className="rounded-2xl px-4 py-3.5 text-sm text-center"
              style={{
                background: "#FFF8E7",
                border: "1px solid rgba(212,175,55,0.3)",
                color: "#6B5A1F",
              }}
            >
              <p className="font-medium mb-1">Limite de session atteinte</p>
              <p className="text-xs" style={{ color: "#9B8540" }}>
                Pour continuer, contactez un conseiller HOOMY.
              </p>
              <a
                href="tel:+212000000000"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold px-4 py-2 rounded-full transition-colors"
                style={{ background: "#0F4C3A", color: "#fff" }}
              >
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.44 2 2 0 0 1 3.6 1.26h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6.06 6.06l1.07-.93a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                Contacter un conseiller
              </a>
            </div>
          )}
        </div>

        {/* Zone de saisie */}
        {!limiteAtteinte && (
          <div
            className="flex-shrink-0 px-4 py-3.5"
            style={{ borderTop: "1px solid #F0EDE5", background: "#fff" }}
          >
            <div className="flex gap-2.5 items-center">
              <input
                ref={champRef}
                type="text"
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
                onKeyDown={gererTouche}
                disabled={chargement}
                placeholder="Votre question immobilière…"
                maxLength={500}
                className="flex-1 rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  border: "1.5px solid #EDE7D7",
                  color: "#1a2822",
                  background: chargement ? "#FAF7F0" : "#fff",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#0F4C3A";
                  e.target.style.boxShadow = "0 0 0 3px rgba(15,76,58,0.08)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#EDE7D7";
                  e.target.style.boxShadow = "none";
                }}
              />
              <button
                type="button"
                onClick={envoyerMessage}
                disabled={!saisie.trim() || chargement}
                aria-label="Envoyer"
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all motion-safe:duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background:
                    saisie.trim() && !chargement
                      ? "linear-gradient(135deg, #0F4C3A 0%, #146C43 100%)"
                      : "#E8E4D9",
                  color: saisie.trim() && !chargement ? "#fff" : "#B4AD97",
                  boxShadow:
                    saisie.trim() && !chargement
                      ? "0 4px 12px rgba(15,76,58,0.28)"
                      : "none",
                }}
              >
                <IcEnvoyer />
              </button>
            </div>

            <p className="text-center mt-2 text-[10px]" style={{ color: "#C4BFAE" }}>
              {LIMITE_MSG_UTILISATEUR - nbMsgUtilisateur} questions restantes
            </p>
          </div>
        )}
      </div>

      {/* ── Bouton flottant ── */}
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-label={ouvert ? "Fermer l'assistant HOOMY" : "Ouvrir l'assistant HOOMY"}
        aria-expanded={ouvert}
        className={[
          "fixed z-[9999] bottom-6 right-6",
          "w-14 h-14 rounded-full flex items-center justify-center",
          "shadow-lg motion-safe:transition-all motion-safe:duration-200",
          ouvert
            ? "scale-90 opacity-80"
            : "hover:scale-105 hover:shadow-xl",
        ].join(" ")}
        style={{
          background: "linear-gradient(135deg, #0F4C3A 0%, #146C43 100%)",
          color: "#fff",
          boxShadow: "0 8px 24px rgba(15,76,58,0.35), 0 2px 8px rgba(15,76,58,0.2)",
        }}
      >
        {/* Icône toggle chat / fermer */}
        <span
          className="motion-safe:transition-transform motion-safe:duration-200"
          style={{ transform: ouvert ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          {ouvert ? <IcFermer /> : <IcChat taille={22} />}
        </span>

        {/* Point doré (indicateur non-lu) */}
        {!ouvert && (
          <span
            className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
            style={{ background: "#D4AF37" }}
            aria-hidden="true"
          />
        )}
      </button>
    </>
  );
}
