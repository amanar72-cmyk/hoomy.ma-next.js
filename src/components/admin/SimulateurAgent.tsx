"use client";

// Simulateur de l'agent commercial IA — interface admin.
// Envoie le message client à /api/agent/simulateur (serveur : la clé OpenAI
// n'est jamais exposée ici) et affiche le fil + le diagnostic du dernier tour.
//
// Conversation MULTI-TOURS : les messages s'enchaînent sous un numéro fictif
// (+212000000000) et sont VRAIMENT écrits en base, comme sur WhatsApp — c'est
// ce qui permet de tester la mémoire. « Réinitialiser » efface le fil fictif.

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

type Criteres = {
  ville: string | null;
  quartier: string | null;
  type: string | null;
  budget_max: number | null;
  chambres: number | null;
  prenom: string | null;
};

type Resultat = {
  intention: "acheteur" | "vendeur" | "autre";
  hors_zone?: boolean;
  langue: "fr" | "ar" | "en";
  criteres: Criteres;
  corrections?: string[];
  biens: BienResultat[];
  reponse: string;
  duree_ms: number;
  conversation_entamee?: boolean;
  nb_messages_historique?: number;
};

/** Un tour affiché dans le fil. */
type Tour = { role: "client" | "agent"; contenu: string };

// Scénario de test de la MÉMOIRE : à envoyer dans l'ordre. L'agent ne doit
// pas resaluer au 2e message, ne pas redemander la ville au 3e, et remplacer
// 2 chambres par 3 au 4e sans perdre la ville ni le budget.
const EXEMPLES = [
  "Bonjour, je cherche un appartement 2 chambres à Agadir",
  "Mon budget est de 1 million max",
  "Finalement plutôt 3 chambres",
  "Salam, bghit nbi3 villa dyali f Marrakech",
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
  const [fil, setFil] = useState<Tour[]>([]);

  /** Efface la conversation fictive en base ET à l'écran. */
  async function reinitialiser() {
    if (chargement) return;
    setChargement(true);
    setErreur(null);
    try {
      const rep = await fetch("/api/agent/simulateur", { method: "DELETE" });
      if (!rep.ok) {
        setErreur("Réinitialisation impossible — réessayez.");
        return;
      }
      setFil([]);
      setResultat(null);
      setMessage("");
    } catch {
      setErreur("Impossible de joindre le serveur (erreur réseau) — réessayez.");
    } finally {
      setChargement(false);
    }
  }

  async function tester(texte?: string) {
    const contenu = (texte ?? message).trim();
    if (!contenu || chargement) return;

    setChargement(true);
    setErreur(null);
    // Le message part au fil immédiatement ; le champ se vide (comme WhatsApp).
    setFil((f) => [...f, { role: "client", contenu }]);
    setMessage("");
    try {
      const rep = await fetch("/api/agent/simulateur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: contenu }),
      });

      // Diagnostic précis : on lit le texte brut, puis on tente le JSON.
      // Une redirection middleware ou une page HTML n'est ainsi plus masquée
      // par un message générique.
      const texte = await rep.text();
      let donnees: Record<string, unknown> | null = null;
      try {
        donnees = JSON.parse(texte) as Record<string, unknown>;
      } catch {
        donnees = null;
      }

      if (!rep.ok || !donnees) {
        const extrait = texte.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);
        const redirection = rep.redirected ? ` — redirigée vers ${rep.url}` : "";
        setErreur(
          (donnees?.erreur as string | undefined) ??
            `Réponse inattendue du serveur (HTTP ${rep.status}${redirection}) : ${extrait || "réponse vide"}`
        );
        // Le tour a échoué : on retire le message du fil et on le remet dans le
        // champ, sinon l'affichage montrerait un message que la base n'a pas.
        setFil((f) => f.slice(0, -1));
        setMessage(contenu);
        return;
      }

      const r = donnees as unknown as Resultat;
      setResultat(r);
      if (r.reponse?.trim()) {
        setFil((f) => [...f, { role: "agent", contenu: r.reponse.trim() }]);
      }
    } catch {
      setErreur("Impossible de joindre le serveur (erreur réseau) — réessayez.");
      setFil((f) => f.slice(0, -1));
      setMessage(contenu);
    } finally {
      setChargement(false);
    }
  }

  // Critères EFFECTIFS (mémoire fusionnée), pas ceux du seul dernier message :
  // c'est ce cumul qui prouve que la mémoire fonctionne.
  const criteresAffiches = resultat
    ? ([
        ["Prénom", resultat.criteres.prenom],
        ["Ville", resultat.criteres.ville],
        ["Quartier", resultat.criteres.quartier],
        ["Type", resultat.criteres.type],
        ["Budget max", resultat.criteres.budget_max ? dh(resultat.criteres.budget_max) : null],
        ["Chambres min", resultat.criteres.chambres?.toString() ?? null],
      ] as [string, string | null][])
    : [];

  return (
    <div className="space-y-5">
      {/* ── Fil de conversation ────────────────────────────────────────────── */}
      {fil.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#9DB8AD" }}>
              Conversation ({fil.length} message{fil.length > 1 ? "s" : ""})
            </span>
            <button
              type="button"
              onClick={() => void reinitialiser()}
              disabled={chargement}
              className="text-xs px-2.5 py-1.5 rounded-lg cursor-pointer hover:opacity-80 disabled:opacity-50"
              style={{ background: "#FEF3C7", color: "#92400E", border: "none" }}
            >
              ↺ Réinitialiser
            </button>
          </div>

          <div className="space-y-2.5">
            {fil.map((t, i) => (
              <div key={i} className={`flex ${t.role === "client" ? "justify-end" : "justify-start"}`}>
                <div
                  className="text-sm rounded-2xl px-3.5 py-2.5 max-w-[80%] whitespace-pre-wrap"
                  style={
                    t.role === "client"
                      ? { background: "#0F4C3A", color: "#fff" }
                      : { background: "#F0EDE5", color: "#1f2a24" }
                  }
                >
                  {t.contenu}
                </div>
              </div>
            ))}
            {chargement && (
              <div className="flex justify-start">
                <div className="text-sm rounded-2xl px-3.5 py-2.5" style={{ background: "#F0EDE5", color: "#9DB8AD" }}>
                  L&apos;agent réfléchit…
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Saisie ─────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "#fff", border: "1px solid #EBEBEB" }}
      >
        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#9DB8AD" }}>
          {fil.length > 0 ? "Message suivant du client" : "Message client (comme reçu sur WhatsApp)"}
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
            {chargement ? "Analyse en cours…" : fil.length > 0 ? "Envoyer ▸" : "Tester ▸"}
          </button>
          <span className="text-xs" style={{ color: "#C4D8CE" }}>
            {fil.length > 0 ? "suite du scénario :" : "scénario mémoire (dans l'ordre) :"}
          </span>
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
              {resultat.hors_zone && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "#FEF3C7", color: "#92400E" }}>
                  📍 Hors zone — réponse honnête
                </span>
              )}
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
