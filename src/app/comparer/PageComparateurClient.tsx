"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Bien } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type BienComplet = Bien & { charges: number | null };

type ScoreMap = Record<string, number>; // `${ville}:${quartier}` → score

type AnalyseIA = {
  analyse: string;
  meilleur_rapport: string;
  pour_habiter: string;
  pour_investir: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrix(bien: BienComplet): string {
  return `${bien.prix.toLocaleString("fr-FR")} DH${bien.transaction === "location" ? "/mois" : ""}`;
}

function prixM2(bien: BienComplet): number | null {
  if (!bien.surface || bien.surface <= 0) return null;
  return Math.round(bien.prix / bien.surface);
}

function cheminBien(bien: BienComplet): string {
  return `/${bien.transaction === "location" ? "louer" : "acheter"}/${bien.slug ?? bien.id}`;
}

function scoreQuartier(bien: BienComplet, scores: ScoreMap): number | null {
  if (!bien.quartier) return null;
  return scores[`${bien.ville}:${bien.quartier}`] ?? null;
}

function best<T extends number>(vals: (T | null)[], mode: "min" | "max"): T | null {
  const nums = vals.filter((v): v is T => v !== null);
  if (nums.length < 2) return null;
  return mode === "min" ? (Math.min(...nums) as T) : (Math.max(...nums) as T);
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function IcBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 12,
        fontWeight: 600,
        color: "var(--primaire-clair)",
        background: "var(--succes-fond)",
        borderRadius: 20,
        padding: "2px 10px",
      }}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      Vérifié
    </span>
  ) : (
    <span style={{ color: "var(--texte-pale)", fontSize: 13 }}>—</span>
  );
}

function CelluleMeilleure({ children, active }: { children: React.ReactNode; active: boolean }) {
  return (
    <td
      style={{
        padding: "14px 16px",
        textAlign: "center",
        fontSize: 14,
        fontWeight: active ? 700 : 400,
        color: active ? "var(--primaire)" : "var(--texte-corps)",
        background: active ? "#E8F5EE" : "transparent",
        position: "relative",
        borderBottom: "1px solid #F0EDE5",
      }}
    >
      {active && (
        <span
          style={{
            position: "absolute",
            top: 6,
            right: 8,
            fontSize: 9,
            fontWeight: 700,
            color: "var(--fond-secondaire)",
            background: "var(--primaire-clair)",
            borderRadius: 4,
            padding: "1px 5px",
            letterSpacing: 0.5,
          }}
        >
          MEILLEUR
        </span>
      )}
      {children}
    </td>
  );
}

function SectionIA({ titre, texte, icone }: { titre: string; texte: string; icone: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--fond-secondaire)",
        border: "1px solid #EDE7D7",
        borderRadius: 12,
        padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "var(--fond-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icone}
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--primaire)", margin: 0 }}>{titre}</p>
      </div>
      <p style={{ fontSize: 13, color: "var(--texte-corps)", lineHeight: 1.7, margin: 0 }}>{texte}</p>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function PageComparateurClient() {
  const searchParams = useSearchParams();
  const ids = (searchParams.get("biens") ?? "").split(",").filter(Boolean);

  const [biens, setBiens] = useState<BienComplet[]>([]);
  const [scores, setScores] = useState<ScoreMap>({});
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const [analyseIA, setAnalyseIA] = useState<AnalyseIA | null>(null);
  const [chargementIA, setChargementIA] = useState(false);
  const [erreurIA, setErreurIA] = useState<string | null>(null);

  const [lienCopie, setLienCopie] = useState(false);

  // ── Fetch biens ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (ids.length === 0) {
      setErreur("Aucun bien sélectionné.");
      setChargement(false);
      return;
    }
    if (ids.length > 4) {
      setErreur("Maximum 4 biens.");
      setChargement(false);
      return;
    }

    async function charger() {
      const supabase = createClient();

      const { data: biensData, error } = await supabase
        .from("biens")
        .select("*")
        .in("id", ids);

      if (error || !biensData) {
        setErreur("Impossible de charger les biens.");
        setChargement(false);
        return;
      }

      // Conserver l'ordre des IDs de l'URL
      const biensOrdres = ids
        .map((id) => biensData.find((b) => b.id === id))
        .filter((b): b is BienComplet => !!b);

      setBiens(biensOrdres);

      // Fetch scores quartiers
      const quartiersNoms = biensOrdres
        .map((b) => b.quartier)
        .filter((q): q is string => !!q);

      if (quartiersNoms.length > 0) {
        const { data: qData } = await supabase
          .from("quartiers")
          .select(
            "nom, ville, score_ecoles, score_hopitaux, score_transports, score_commerces, score_securite, score_espaces_verts"
          )
          .in("nom", quartiersNoms);

        const map: ScoreMap = {};
        for (const q of qData ?? []) {
          const sg = Math.round(
            (q.score_ecoles + q.score_hopitaux + q.score_transports +
              q.score_commerces + q.score_securite + q.score_espaces_verts) / 6
          );
          map[`${q.ville}:${q.nom}`] = sg;
        }
        setScores(map);
      }

      setChargement(false);
    }

    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ── Analyse IA ─────────────────────────────────────────────────────────────
  async function lancerAnalyse() {
    setChargementIA(true);
    setErreurIA(null);

    try {
      const payload = biens.map((b) => ({
        titre: b.titre,
        type: b.type,
        ville: b.ville,
        quartier: b.quartier ?? null,
        surface: b.surface,
        prix: b.prix,
        prixM2: prixM2(b),
        chambres: b.chambres,
        sallesBain: b.salles_bain,
        charges: b.charges ?? null,
        scoreQuartier: scoreQuartier(b, scores),
        transaction: b.transaction,
      }));

      const res = await fetch("/api/comparer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ biens: payload }),
      });

      const json = await res.json();
      if (!res.ok || json.erreur) {
        setErreurIA(json.erreur ?? "Erreur lors de l'analyse.");
      } else {
        setAnalyseIA(json.analyse);
      }
    } catch {
      setErreurIA("Erreur réseau. Veuillez réessayer.");
    } finally {
      setChargementIA(false);
    }
  }

  // ── Partager ───────────────────────────────────────────────────────────────
  function copierLien() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setLienCopie(true);
      setTimeout(() => setLienCopie(false), 2200);
    });
  }

  // ── Valeurs "meilleures" ───────────────────────────────────────────────────
  const pm2List = biens.map(prixM2);
  const bestPm2 = best(pm2List, "min");
  const scoreList = biens.map((b) => scoreQuartier(b, scores));
  const bestScore = best(scoreList, "max");

  // ── États de chargement / erreur ───────────────────────────────────────────
  if (chargement) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <p style={{ color: "var(--texte-tertiaire)", fontFamily: "var(--font-outfit, sans-serif)" }}>Chargement…</p>
      </div>
    );
  }

  if (erreur || biens.length < 2) {
    return (
      <div style={{ maxWidth: 480, margin: "80px auto", textAlign: "center", padding: "0 24px" }}>
        <p style={{ color: "var(--erreur)", marginBottom: 16 }}>{erreur ?? "Sélectionnez au moins 2 biens pour comparer."}</p>
        <Link href="/acheter" style={{ color: "var(--primaire)", textDecoration: "underline" }}>
          Parcourir les annonces
        </Link>
      </div>
    );
  }

  const labelStyle: React.CSSProperties = {
    padding: "14px 16px",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--texte-secondaire)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    background: "var(--fond-principal)",
    borderBottom: "1px solid #F0EDE5",
    whiteSpace: "nowrap" as const,
    position: "sticky" as const,
    left: 0,
    zIndex: 2,
  };

  const cellStyle: React.CSSProperties = {
    padding: "14px 16px",
    textAlign: "center",
    fontSize: 14,
    color: "var(--texte-corps)",
    borderBottom: "1px solid #F0EDE5",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ── En-tête ──────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
          <div>
            <h1
              style={{
                fontFamily: "var(--font-marcellus), serif",
                fontSize: 26,
                color: "var(--primaire)",
                margin: 0,
                fontWeight: 400,
              }}
            >
              Comparatif de biens
            </h1>
            <p style={{ color: "var(--texte-tertiaire)", fontSize: 13, margin: "4px 0 0" }}>
              {biens.length} biens · {biens[0]?.ville}
            </p>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <Link
              href="/acheter"
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1.5px solid #EDE7D7",
                color: "var(--texte-secondaire)",
                fontSize: 13,
                textDecoration: "none",
                background: "var(--fond-secondaire)",
              }}
            >
              ← Retour aux annonces
            </Link>
            <button
              type="button"
              onClick={copierLien}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1.5px solid #EDE7D7",
                background: lienCopie ? "var(--primaire-clair)" : "var(--fond-secondaire)",
                color: lienCopie ? "var(--fond-secondaire)" : "var(--primaire)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.2s",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {lienCopie ? (
                  <polyline points="20 6 9 17 4 12" />
                ) : (
                  <>
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </>
                )}
              </svg>
              {lienCopie ? "Lien copié !" : "Partager ce comparatif"}
            </button>
          </div>
        </div>

        {/* ── Tableau ──────────────────────────────────────────────────────── */}
        <div
          style={{
            background: "var(--fond-secondaire)",
            borderRadius: 16,
            border: "1px solid #EDE7D7",
            boxShadow: "0 2px 16px rgba(15,76,58,0.06)",
            overflow: "hidden",
            marginBottom: 32,
          }}
        >
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 200 + biens.length * 220,
              }}
            >
              {/* ── En-têtes biens ───────────────────────────────────────── */}
              <thead>
                <tr>
                  <th
                    style={{
                      ...labelStyle,
                      borderBottom: "2px solid #EDE7D7",
                      background: "var(--fond-principal)",
                    }}
                  />
                  {biens.map((b) => (
                    <th
                      key={b.id}
                      style={{
                        padding: "20px 16px 16px",
                        textAlign: "center",
                        verticalAlign: "top",
                        borderBottom: "2px solid #EDE7D7",
                        borderLeft: "1px solid #F0EDE5",
                        minWidth: 220,
                      }}
                    >
                      {/* Photo */}
                      <div
                        style={{
                          width: 80,
                          height: 60,
                          borderRadius: 8,
                          overflow: "hidden",
                          margin: "0 auto 10px",
                          background: "var(--bordure)",
                        }}
                      >
                        {b.photos?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={b.photos[0]}
                            alt={b.titre}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#0F4C3A,#146C43)" }} />
                        )}
                      </div>

                      {/* Référence */}
                      {b.reference && (
                        <p style={{ fontSize: 10, color: "var(--texte-pale)", margin: "0 0 4px", fontFamily: "ui-monospace,monospace" }}>
                          {b.reference}
                        </p>
                      )}

                      {/* Titre */}
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--primaire)",
                          margin: "0 0 10px",
                          lineHeight: 1.35,
                        }}
                      >
                        {b.titre}
                      </p>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <Link
                          href={cheminBien(b)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--primaire)",
                            border: "1.5px solid #0F4C3A",
                            borderRadius: 6,
                            padding: "4px 10px",
                            textDecoration: "none",
                          }}
                        >
                          Voir l'annonce ↗
                        </Link>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* ── Corps du tableau ─────────────────────────────────────── */}
              <tbody>
                {/* Prix */}
                <tr>
                  <td style={labelStyle}>Prix</td>
                  {biens.map((b) => (
                    <td key={b.id} style={{ ...cellStyle, fontWeight: 700, color: "var(--primaire)", fontFamily: "var(--font-marcellus),serif", fontSize: 15, borderLeft: "1px solid #F0EDE5" }}>
                      {formatPrix(b)}
                    </td>
                  ))}
                </tr>

                {/* Surface */}
                <tr style={{ background: "var(--fond-principal)" }}>
                  <td style={{ ...labelStyle, background: "var(--fond-accent)" }}>Surface</td>
                  {biens.map((b) => (
                    <td key={b.id} style={{ ...cellStyle, background: "var(--fond-principal)", borderLeft: "1px solid #F0EDE5" }}>
                      {b.surface > 0 ? `${b.surface} m²` : "—"}
                    </td>
                  ))}
                </tr>

                {/* Prix/m² — meilleur mis en évidence */}
                <tr>
                  <td style={labelStyle}>Prix / m²</td>
                  {biens.map((b) => {
                    const pm2 = prixM2(b);
                    const active = pm2 !== null && pm2 === bestPm2;
                    return (
                      <CelluleMeilleure key={b.id} active={active}>
                        <span style={{ borderLeft: "1px solid #F0EDE5", display: "block", padding: "0" }}>
                          {pm2 !== null ? `${pm2.toLocaleString("fr-FR")} DH/m²` : "—"}
                        </span>
                      </CelluleMeilleure>
                    );
                  })}
                </tr>

                {/* Chambres */}
                <tr style={{ background: "var(--fond-principal)" }}>
                  <td style={{ ...labelStyle, background: "var(--fond-accent)" }}>Chambres</td>
                  {biens.map((b) => (
                    <td key={b.id} style={{ ...cellStyle, background: "var(--fond-principal)", borderLeft: "1px solid #F0EDE5" }}>
                      {b.chambres > 0 ? b.chambres : "—"}
                    </td>
                  ))}
                </tr>

                {/* Salles de bain */}
                <tr>
                  <td style={labelStyle}>Salles de bain</td>
                  {biens.map((b) => (
                    <td key={b.id} style={{ ...cellStyle, borderLeft: "1px solid #F0EDE5" }}>
                      {b.salles_bain > 0 ? b.salles_bain : "—"}
                    </td>
                  ))}
                </tr>

                {/* Charges */}
                <tr style={{ background: "var(--fond-principal)" }}>
                  <td style={{ ...labelStyle, background: "var(--fond-accent)" }}>Charges</td>
                  {biens.map((b) => (
                    <td key={b.id} style={{ ...cellStyle, background: "var(--fond-principal)", borderLeft: "1px solid #F0EDE5" }}>
                      {b.charges ? `${b.charges.toLocaleString("fr-FR")} DH/mois` : "—"}
                    </td>
                  ))}
                </tr>

                {/* Localisation */}
                <tr>
                  <td style={labelStyle}>Localisation</td>
                  {biens.map((b) => (
                    <td key={b.id} style={{ ...cellStyle, borderLeft: "1px solid #F0EDE5" }}>
                      <span style={{ fontWeight: 600 }}>{b.ville}</span>
                      {b.quartier && (
                        <>
                          <br />
                          <span style={{ fontSize: 12, color: "var(--texte-tertiaire)" }}>{b.quartier}</span>
                        </>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Type */}
                <tr style={{ background: "var(--fond-principal)" }}>
                  <td style={{ ...labelStyle, background: "var(--fond-accent)" }}>Type</td>
                  {biens.map((b) => (
                    <td key={b.id} style={{ ...cellStyle, background: "var(--fond-principal)", borderLeft: "1px solid #F0EDE5" }}>
                      {b.type}
                    </td>
                  ))}
                </tr>

                {/* Score quartier — meilleur mis en évidence */}
                <tr>
                  <td style={labelStyle}>Score quartier</td>
                  {biens.map((b) => {
                    const sg = scoreQuartier(b, scores);
                    const active = sg !== null && sg === bestScore;
                    return (
                      <CelluleMeilleure key={b.id} active={active}>
                        <span style={{ borderLeft: "1px solid #F0EDE5", display: "block" }}>
                          {sg !== null ? (
                            <span style={{ fontSize: 16, fontFamily: "var(--font-marcellus),serif" }}>
                              {sg}
                              <span style={{ fontSize: 11, fontWeight: 400, color: "var(--texte-tertiaire)" }}>/100</span>
                            </span>
                          ) : "—"}
                        </span>
                      </CelluleMeilleure>
                    );
                  })}
                </tr>

                {/* Vérifié */}
                <tr style={{ background: "var(--fond-principal)" }}>
                  <td style={{ ...labelStyle, background: "var(--fond-accent)", borderBottom: "none" }}>Bien vérifié</td>
                  {biens.map((b) => (
                    <td key={b.id} style={{ ...cellStyle, background: "var(--fond-principal)", borderBottom: "none", borderLeft: "1px solid #F0EDE5" }}>
                      <IcBadge ok={b.verifie} />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Analyse IA ───────────────────────────────────────────────────── */}
        <div
          style={{
            background: "linear-gradient(135deg, #FAF7F0 0%, #F5F0E6 100%)",
            border: "1px solid #EDE7D7",
            borderRadius: 16,
            padding: "28px 28px",
            marginBottom: 60,
          }}
        >
          {/* En-tête section IA */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primaire)" strokeWidth="2">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h2
                  style={{
                    fontFamily: "var(--font-marcellus),serif",
                    fontSize: 18,
                    color: "var(--primaire)",
                    margin: 0,
                    fontWeight: 400,
                  }}
                >
                  Analyse par l'IA HOOMY
                </h2>
                <p style={{ fontSize: 12, color: "var(--texte-tertiaire)", margin: "2px 0 0" }}>
                  Propulsé par Gemini · Analyse factuelle basée sur les données
                </p>
              </div>
            </div>

            {!analyseIA && (
              <button
                type="button"
                onClick={lancerAnalyse}
                disabled={chargementIA}
                style={{
                  padding: "10px 22px",
                  borderRadius: 10,
                  border: "none",
                  background: "var(--primaire)",
                  color: "var(--fond-secondaire)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: chargementIA ? "wait" : "pointer",
                  opacity: chargementIA ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "opacity 0.2s",
                }}
              >
                {chargementIA ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Analyse en cours…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    Analyser avec l'IA
                  </>
                )}
              </button>
            )}
          </div>

          {/* Spinner CSS */}
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

          {/* Erreur IA */}
          {erreurIA && (
            <div style={{ padding: "12px 16px", borderRadius: 10, background: "var(--erreur-fond)", color: "var(--erreur-texte)", fontSize: 13, marginBottom: 16 }}>
              {erreurIA}
              <button
                type="button"
                onClick={lancerAnalyse}
                style={{ marginLeft: 12, textDecoration: "underline", background: "none", border: "none", color: "var(--erreur-texte)", cursor: "pointer", fontSize: 13 }}
              >
                Réessayer
              </button>
            </div>
          )}

          {/* Placeholder avant analyse */}
          {!analyseIA && !chargementIA && !erreurIA && (
            <p style={{ color: "var(--texte-tertiaire)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
              Cliquez sur "Analyser avec l'IA" pour obtenir une analyse comparative personnalisée.
            </p>
          )}

          {/* Résultats IA */}
          {analyseIA && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
              <SectionIA
                titre="Analyse comparative"
                texte={analyseIA.analyse}
                icone={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                }
              />
              <SectionIA
                titre="Meilleur rapport qualité/prix"
                texte={analyseIA.meilleur_rapport}
                icone={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                }
              />
              <SectionIA
                titre="Pour habiter"
                texte={analyseIA.pour_habiter}
                icone={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primaire)" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                }
              />
              <SectionIA
                titre="Pour investir"
                texte={analyseIA.pour_investir}
                icone={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primaire)" strokeWidth="2">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                }
              />
            </div>
          )}

          {analyseIA && (
            <p style={{ fontSize: 10, color: "var(--texte-pale)", marginTop: 16, textAlign: "center" }}>
              Analyse générée par IA à titre indicatif. Consultez un conseiller HOOMY pour une estimation personnalisée.
            </p>
          )}
        </div>

      </div>
  );
}
