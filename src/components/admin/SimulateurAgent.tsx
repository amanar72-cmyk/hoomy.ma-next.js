"use client";

// Simulateur de l'agent commercial IA — interface admin.
// Envoie le message client à /api/agent/simulateur (serveur : la clé Anthropic
// n'est jamais exposée ici) et affiche le diagnostic complet + la réponse.

import { useState } from "react";

type BienResultat = {
  reference: string | null;
  titre: string;
  type: string;
  transaction: string;
  ville: string;
  quartier: string | null;
  prix: number;
  chambres: number;
  surface: number;
  lien: string;
};

type Resultat = {
  intention: "acheteur" | "vendeur" | "autre";
  langue: "fr" | "ar" | "en";
  criteres: {
    ville: string | null;
    quartier: string | null;
    type: string | null;
    budget_max: number | null;
    chambres: number | null;
  };
  biens: BienResultat[];
  reponse: string;
  duree_ms: number;
};

const EXEMPLES = [
  "Bonjour, je cherche un appartement 2 chambres à Casablanca, budget 900 000 DH max",
  "Salam, bghit nbi3 villa dyali f Marrakech",
  "Hi, do you have villas for rent in Tangier?",
  "C'est quoi vos horaires ?",
];

const BADGE_INTENTION: Record<string, { label: string; bg: string; color: string }> = {
  acheteur: { label: "🏠 Acheteur", bg: "#D1FAE5", color: "#065F46" },
  vendeur: { label: "🏷️ Vendeur", bg: "#FEF3C7", color: "#92400E" },
  autre: { label: "💬 Autre", bg: "#E5E7EB", color: "#4B5563" },
};

const BADGE_LANGUE: Record<string, string> = { fr: "🇫🇷 Français", ar: "🇲🇦 Darija/Arabe", en: "🇬🇧 Anglais" };

function dh(n: number): string {
  return `${n.toLocaleString("fr-FR")} DH`;
}

export default function SimulateurAgent() {
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<Resultat | null>(null);

  async function tester(texte?: string) {
    const contenu = (texte ?? message).trim();
    if (!contenu || chargement) return;
    if (texte) setMessage(texte);

    setChargement(true);
    setErreur(null);
    setResultat(null);
    try {
      const rep = await fetch("/api/agent/simulateur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: contenu }),
      });
      const donnees = await rep.json();
      if (!rep.ok) {
        setErreur(donnees.erreur ?? `Erreur ${rep.status}`);
        return;
      }
      setResultat(donnees as Resultat);
    } catch {
      setErreur("Impossible de joindre le serveur — réessayez.");
    } finally {
      setChargement(false);
    }
  }

  const criteresAffiches = resultat
    ? ([
        ["Ville", resultat.criteres.ville],
        ["Quartier", resultat.criteres.quartier],
        ["Type", resultat.criteres.type],
        ["Budget max", resultat.criteres.budget_max ? dh(resultat.criteres.budget_max) : null],
        ["Chambres min", resultat.criteres.chambres?.toString() ?? null],
      ] as [string, string | null][])
    : [];

  return (
    <div className="space-y-5">
      {/* ── Saisie ─────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "#fff", border: "1px solid #EBEBEB" }}
      >
        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#9DB8AD" }}>
          Message client (comme reçu sur WhatsApp)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void tester();
          }}
          rows={3}
          maxLength={2000}
          placeholder="Ex. : Bonjour, je cherche un appartement à Marrakech…"
          className="w-full border rounded-xl px-3.5 py-3 text-sm focus:outline-none"
          style={{ borderColor: "#E0DAC8", color: "#1f2a24", resize: "vertical", background: "#FFFDF8" }}
        />

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <button
            type="button"
            onClick={() => void tester()}
            disabled={chargement || !message.trim()}
            className="text-sm font-semibold px-5 py-2.5 rounded-xl cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "#0F4C3A", color: "#fff", border: "none" }}
          >
            {chargement ? "Analyse en cours…" : "Tester ▸"}
          </button>
          <span className="text-xs" style={{ color: "#C4D8CE" }}>ou essayez :</span>
          {EXEMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => void tester(ex)}
              disabled={chargement}
              className="text-xs px-2.5 py-1.5 rounded-lg cursor-pointer hover:opacity-80 disabled:opacity-50 truncate max-w-[220px]"
              style={{ background: "#F0EDE5", color: "#6B7A71", border: "none" }}
              title={ex}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* ── Erreur ─────────────────────────────────────────────────────────── */}
      {erreur && (
        <div
          role="alert"
          className="rounded-2xl px-5 py-4"
          style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
        >
          <p className="text-sm font-semibold" style={{ color: "#991B1B" }}>⚠ {erreur}</p>
        </div>
      )}

      {/* ── Résultat ───────────────────────────────────────────────────────── */}
      {resultat && (
        <>
          {/* Diagnostic : intention + langue + critères */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "#fff", border: "1px solid #EBEBEB" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#9DB8AD" }}>
              Étape A — Ce que l&apos;agent a compris
            </p>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: BADGE_INTENTION[resultat.intention].bg,
                  color: BADGE_INTENTION[resultat.intention].color,
                }}
              >
                {BADGE_INTENTION[resultat.intention].label}
              </span>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "#F0EDE5", color: "#6B7A71" }}>
                {BADGE_LANGUE[resultat.langue]}
              </span>
              <span className="text-xs ml-auto" style={{ color: "#C4D8CE" }}>
                {(resultat.duree_ms / 1000).toFixed(1)} s
              </span>
            </div>
            {resultat.intention === "acheteur" && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {criteresAffiches.map(([label, valeur]) => (
                  <div key={label} className="rounded-lg px-2.5 py-2" style={{ background: "#F8F5EE" }}>
                    <p className="text-xs" style={{ color: "#9DB8AD" }}>{label}</p>
                    <p className="text-xs font-semibold" style={{ color: valeur ? "#0F4C3A" : "#C4D8CE" }}>
                      {valeur ?? "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Biens réels remontés (acheteur) */}
          {resultat.intention === "acheteur" && (
            <div
              className="rounded-2xl p-4"
              style={{ background: "#fff", border: "1px solid #EBEBEB" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#9DB8AD" }}>
                Étape B — Biens réels trouvés ({resultat.biens.length})
              </p>
              {resultat.biens.length === 0 ? (
                <p className="text-sm" style={{ color: "#9DB8AD" }}>
                  Aucun bien publié ne correspond aux critères — l&apos;agent doit le dire honnêtement.
                </p>
              ) : (
                <div className="space-y-2">
                  {resultat.biens.map((b) => (
                    <a
                      key={b.lien + (b.reference ?? "")}
                      href={b.lien}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-3 py-2.5 hover:opacity-90"
                      style={{ background: "#F8F5EE", textDecoration: "none" }}
                    >
                      <span className="text-sm font-medium flex-1 min-w-0 truncate" style={{ color: "#0F4C3A" }}>
                        {b.titre}
                      </span>
                      <span className="text-xs" style={{ color: "#6B7A71" }}>
                        {b.quartier ? `${b.quartier} · ` : ""}{b.ville}
                      </span>
                      <span className="text-xs font-semibold" style={{ color: "#A07C1E" }}>
                        {dh(b.prix)}{b.transaction === "location" ? "/mois" : ""}
                      </span>
                      {b.reference && (
                        <span className="text-xs font-mono" style={{ color: "#C4D8CE" }}>{b.reference}</span>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Réponse générée — bulle style WhatsApp */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "#fff", border: "1px solid #EBEBEB" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#9DB8AD" }}>
              Étape C — Réponse de l&apos;agent
            </p>
            <div
              className="rounded-2xl rounded-tl-sm px-4 py-3 max-w-xl whitespace-pre-wrap text-sm leading-relaxed"
              style={{
                background: "#E7F6EC",
                border: "1px solid #C6E8D4",
                color: "#1f2a24",
                direction: resultat.langue === "ar" && /[؀-ۿ]/.test(resultat.reponse) ? "rtl" : "ltr",
              }}
            >
              {resultat.reponse}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
