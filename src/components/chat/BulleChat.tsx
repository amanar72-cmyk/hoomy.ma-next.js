"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const ACCUEIL: Message = {
  id: "accueil",
  role: "assistant",
  content:
    "Bonjour ! 👋 Je suis l'assistant HOOMY.\nComment puis-je vous aider dans votre projet immobilier ?\n\nFrançais · العربية · الدارجة · English",
};

const LIMITE_MESSAGES = 20; // messages utilisateur max par session

// ─── Icônes SVG ──────────────────────────────────────────────────────────────

function IcChat() {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.9">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IcFermer() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IcEnvoyer() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IcMaison() {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

// ─── Indicateur "en train d'écrire" ──────────────────────────────────────────

function IndicateurTyping() {
  return (
    <div className="flex items-start gap-2">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-white"
        style={{ background: "var(--primaire)" }}
      >
        <IcMaison />
      </div>
      <div
        className="rounded-2xl rounded-bl-sm px-4 py-3.5"
        style={{ background: "var(--fond-principal)", border: "1px solid #EDE7D7" }}
      >
        <div className="flex gap-1.5 items-center" style={{ height: 14 }}>
          {[0, 160, 320].map((delay, i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full motion-safe:animate-bounce"
              style={{
                background: "var(--texte-tertiaire)",
                animationDelay: `${delay}ms`,
                animationDuration: "900ms",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Bulle de message ─────────────────────────────────────────────────────────

function BulleMessage({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        {/* dir="auto" : gère RTL pour l'arabe et la darija */}
        <p
          dir="auto"
          className="max-w-[82%] rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words"
          style={{ background: "var(--bordure-legere)", color: "var(--texte-principal)" }}
        >
          {message.content}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-white"
        style={{ background: "var(--primaire)" }}
      >
        <IcMaison />
      </div>
      <p
        dir="auto"
        className="max-w-[82%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words"
        style={{ background: "var(--fond-principal)", border: "1px solid #EDE7D7", color: "var(--texte-principal)" }}
      >
        {message.content}
      </p>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function BulleChat() {
  const [ouvert, setOuvert] = useState(false);
  const [messages, setMessages] = useState<Message[]>([ACCUEIL]);
  const [saisie, setSaisie] = useState("");
  const [chargement, setChargement] = useState(false);

  const zoneMsgRef = useRef<HTMLDivElement>(null);
  const champRef = useRef<HTMLInputElement>(null);

  const nbMsgUtilisateur = messages.filter((m) => m.role === "user").length;
  const limiteAtteinte = nbMsgUtilisateur >= LIMITE_MESSAGES;

  // Scroll vers le bas à chaque nouveau message
  useEffect(() => {
    if (zoneMsgRef.current) {
      zoneMsgRef.current.scrollTop = zoneMsgRef.current.scrollHeight;
    }
  }, [messages, chargement]);

  // Focus sur l'input à l'ouverture
  useEffect(() => {
    if (ouvert) {
      const t = setTimeout(() => champRef.current?.focus(), 180);
      return () => clearTimeout(t);
    }
  }, [ouvert]);

  // Fermeture sur Échap
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ouvert) setOuvert(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [ouvert]);

  // ── Envoi d'un message ──

  const envoyerMessage = useCallback(async () => {
    const texte = saisie.trim();
    if (!texte || chargement || limiteAtteinte) return;

    const msgUtilisateur: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: texte,
    };

    const histoireMaj = [...messages, msgUtilisateur];
    setMessages(histoireMaj);
    setSaisie("");
    setChargement(true);

    try {
      // Le message d'accueil est UI-only : on l'exclut de l'historique API
      const msgsPourAPI = histoireMaj
        .filter((m) => m.id !== "accueil")
        .map(({ role, content }) => ({ role, content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgsPourAPI }),
      });

      const data = await res.json().catch(() => null);
      const reply: string | null = data?.reply ?? null;

      // Le message d'erreur vient toujours de l'API (déjà localisé et safe)
      // — on ne propage jamais d'erreur technique brute au visiteur
      const contenu =
        reply ??
        (data?.erreur && typeof data.erreur === "string" && data.erreur.length < 300
          ? data.erreur
          : "Je rencontre une difficulté momentanée. Veuillez réessayer ou contactez un conseiller HOOMY.");

      setMessages([
        ...histoireMaj,
        { id: `a-${Date.now()}`, role: "assistant", content: contenu },
      ]);
    } catch {
      // Erreur réseau ou JSON invalide — message fixe, jamais de détail technique
      setMessages([
        ...histoireMaj,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content:
            "Je rencontre une difficulté momentanée. Veuillez réessayer ou contactez un conseiller HOOMY.",
        },
      ]);
    } finally {
      setChargement(false);
    }
  }, [saisie, chargement, limiteAtteinte, messages]);

  // ── Gestion du formulaire ──

  function gererSoumission(e: React.FormEvent) {
    e.preventDefault();
    envoyerMessage();
  }

  function gererTouche(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      envoyerMessage();
    }
  }

  // ── Rendu ──

  return (
    <>
      {/* ── Fenêtre de chat ─────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-label="Assistant immobilier HOOMY"
        aria-modal={ouvert}
        aria-hidden={!ouvert}
        className={[
          "fixed z-[9998] flex flex-col overflow-hidden",
          // Mobile : plein écran depuis le bas
          "bottom-0 right-0 left-0 rounded-t-2xl",
          // Desktop : fenêtre compacte en bas à droite
          "sm:left-auto sm:bottom-6 sm:right-6 sm:w-[380px] sm:rounded-2xl",
          // Animation (respecte prefers-reduced-motion)
          "motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out",
          ouvert
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-6 pointer-events-none",
        ].join(" ")}
        style={{
          height: "min(85svh, 555px)",
          background: "var(--fond-secondaire)",
          boxShadow:
            "0 24px 56px rgba(15,76,58,0.22), 0 6px 16px rgba(15,76,58,0.1)",
        }}
      >
        {/* ─ En-tête ───────────────────────────────────────────────── */}
        <header
          className="flex items-center justify-between px-4 py-3.5 flex-shrink-0"
          style={{ background: "var(--primaire)" }}
        >
          <div className="flex items-center gap-3">
            {/* Avatar logo */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: "rgba(212,175,55,0.2)",
                border: "1.5px solid rgba(212,175,55,0.45)",
              }}
            >
              <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div>
              <p
                className="text-sm font-semibold text-white leading-none"
                style={{ fontFamily: "var(--font-marcellus), serif" }}
              >
                Assistant HOOMY
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.58)" }}>
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mr-1 mb-px align-middle"
                  style={{ background: "#4ADE80" }}
                />
                Immobilier · Maroc
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOuvert(false)}
            aria-label="Fermer l'assistant"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ color: "rgba(255,255,255,0.65)", background: "rgba(255,255,255,0.1)" }}
          >
            <IcFermer />
          </button>
        </header>

        {/* ─ Zone de messages ──────────────────────────────────────── */}
        <div
          ref={zoneMsgRef}
          className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3"
          style={{ background: "var(--fond-secondaire)" }}
        >
          {messages.map((msg) => (
            <BulleMessage key={msg.id} message={msg} />
          ))}

          {chargement && <IndicateurTyping />}

          {/* Message de limite atteinte */}
          {limiteAtteinte && !chargement && (
            <div
              className="rounded-2xl px-4 py-4 text-center text-sm"
              style={{
                background: "#FFFBF0",
                border: "1px solid rgba(212,175,55,0.35)",
              }}
            >
              <p className="font-semibold mb-1" style={{ color: "#6B5A1F" }}>
                Limite de session atteinte
              </p>
              <p className="text-xs mb-3" style={{ color: "#9B8540" }}>
                Pour continuer, contactez un conseiller HOOMY.
              </p>
              <a
                href="/contact"
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--primaire)" }}
              >
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.44 2 2 0 0 1 3.6 1.26h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6.06 6.06l.92-1.06a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                Contacter un conseiller
              </a>
            </div>
          )}
        </div>

        {/* ─ Zone de saisie ────────────────────────────────────────── */}
        {!limiteAtteinte && (
          <div
            className="flex-shrink-0 px-4 py-3"
            style={{ borderTop: "1px solid #F0EDE5" }}
          >
            <form onSubmit={gererSoumission} className="flex gap-2 items-center">
              <input
                ref={champRef}
                type="text"
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
                onKeyDown={gererTouche}
                disabled={chargement}
                placeholder="Votre question immobilière…"
                maxLength={500}
                autoComplete="off"
                dir="auto"
                className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none transition-all disabled:opacity-60"
                style={{
                  border: "1.5px solid #EDE7D7",
                  color: "var(--texte-principal)",
                  background: "#FAFAF9",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--primaire)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(15,76,58,0.08)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--bordure)";
                  e.target.style.boxShadow = "none";
                }}
              />
              <button
                type="submit"
                disabled={!saisie.trim() || chargement}
                aria-label="Envoyer"
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all motion-safe:duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: saisie.trim() && !chargement ? "var(--accent)" : "#E8E4D9",
                  color: saisie.trim() && !chargement ? "var(--fond-secondaire)" : "#B4AD97",
                  boxShadow:
                    saisie.trim() && !chargement
                      ? "0 3px 10px rgba(212,175,55,0.4)"
                      : "none",
                }}
              >
                <IcEnvoyer />
              </button>
            </form>
            {/* Compteur discret */}
            <p className="text-center mt-1.5 text-[10px]" style={{ color: "#D4D0C8" }}>
              {LIMITE_MESSAGES - nbMsgUtilisateur} question
              {LIMITE_MESSAGES - nbMsgUtilisateur > 1 ? "s" : ""} restante
              {LIMITE_MESSAGES - nbMsgUtilisateur > 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      {/* ── Bouton flottant ─────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-label={ouvert ? "Fermer l'assistant HOOMY" : "Ouvrir l'assistant HOOMY"}
        aria-expanded={ouvert}
        aria-controls="chat-hoomy"
        className={[
          "fixed z-[9999] bottom-6 right-6",
          "w-14 h-14 rounded-full flex items-center justify-center",
          "text-white motion-safe:transition-all motion-safe:duration-200",
          ouvert
            ? "scale-90"
            : "hover:scale-105",
        ].join(" ")}
        style={{
          background: "var(--primaire)",
          boxShadow: ouvert
            ? "0 4px 14px rgba(15,76,58,0.25)"
            : "0 8px 24px rgba(15,76,58,0.38), 0 2px 8px rgba(15,76,58,0.18)",
        }}
      >
        {/* Icône : chat quand fermé, X quand ouvert */}
        <span
          className="motion-safe:transition-transform motion-safe:duration-200"
          style={{ transform: ouvert ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          {ouvert ? <IcFermer /> : <IcChat />}
        </span>

        {/* Pastille gold (indicateur) — visible uniquement quand fermé */}
        {!ouvert && (
          <span
            aria-hidden="true"
            className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white motion-safe:animate-pulse"
            style={{ background: "var(--accent)", animationDuration: "2.5s" }}
          />
        )}
      </button>
    </>
  );
}
