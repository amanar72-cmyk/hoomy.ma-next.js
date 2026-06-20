"use client";

import { useState, useMemo } from "react";

// ─── Constantes (paramètres marché marocain — ajustables) ─────────────────────
const TAUX_DEFAUT_PCT     = 4.5;        // % annuel, indicatif banques marocaines
const DUREE_MIN_ANS       = 5;
const DUREE_MAX_ANS       = 25;
const DUREE_DEFAUT_ANS    = 20;
const BIEN_DEFAUT         = 1_500_000;  // DH
const APPORT_DEFAUT       = 300_000;    // DH
const BIEN_MAX_SLIDER     = 8_000_000;  // DH
const SEUIL_VERT          = 33;         // % — recommandé par les banques marocaines
const SEUIL_ORANGE        = 40;         // % — limite généralement acceptée

// ─── Formule mensualité (prêt amortissable à taux fixe) ───────────────────────
function calculerMensualite(capital: number, tauxAnnuelPct: number, dureeAns: number): number {
  if (capital <= 0 || dureeAns <= 0) return 0;
  const n = dureeAns * 12;
  if (tauxAnnuelPct === 0) return capital / n;  // taux nul : amortissement pur
  const t = tauxAnnuelPct / 100 / 12;
  return (capital * t) / (1 - Math.pow(1 + t, -n));
}

// ─── Tableau d'amortissement (jalons annuels) ─────────────────────────────────
type LigneAmortissement = {
  annee: number;
  capitalRestant: number;
  capitalRembourse: number;
  interetsCumules: number;
};

function calcTableau(
  capital: number,
  tauxAnnuelPct: number,
  dureeAns: number,
  mensualite: number,
): LigneAmortissement[] {
  if (capital <= 0 || mensualite <= 0) return [];
  const t = tauxAnnuelPct / 100 / 12;
  const n = dureeAns * 12;

  const candidats = [1, 5, 10, 15, 20, 25].filter((a) => a <= dureeAns);
  if (!candidats.includes(dureeAns)) candidats.push(dureeAns);
  const jalons = new Set(candidats);

  const resultats: LigneAmortissement[] = [];
  let capitalRestant = capital;
  let interetsCumules = 0;

  for (let mois = 1; mois <= n; mois++) {
    const interets = tauxAnnuelPct === 0 ? 0 : capitalRestant * t;
    capitalRestant = Math.max(0, capitalRestant - (mensualite - interets));
    interetsCumules += interets;
    if (mois % 12 === 0) {
      const annee = mois / 12;
      if (jalons.has(annee)) {
        resultats.push({
          annee,
          capitalRestant:   Math.round(capitalRestant),
          capitalRembourse: Math.round(capital - capitalRestant),
          interetsCumules:  Math.round(interetsCumules),
        });
      }
    }
  }
  return resultats;
}

// ─── Formatage ─────────────────────────────────────────────────────────────────
function fdh(n: number): string {
  return Math.round(n).toLocaleString("fr-FR") + " DH";
}
function fpct(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " %";
}

// ─── Donut SVG 2 segments (capital / intérêts) ────────────────────────────────
function DonutCapitalInterets({ capital, interets }: { capital: number; interets: number }) {
  const total = capital + interets;
  if (total <= 0) return null;
  const CX = 75, CY = 75, R = 60, Ri = 40, GAP = 2.5;

  function arc(s: number, e: number): string {
    const rad = (d: number) => ((d - 90) * Math.PI) / 180;
    const pt = (d: number, r: number): [number, number] => [
      CX + r * Math.cos(rad(d)),
      CY + r * Math.sin(rad(d)),
    ];
    const [ax, ay] = pt(s, R), [bx, by] = pt(e, R);
    const [cx, cy] = pt(e, Ri), [dx, dy] = pt(s, Ri);
    const lg = e - s > 180 ? 1 : 0;
    return `M${ax.toFixed(1)} ${ay.toFixed(1)} A${R} ${R} 0 ${lg} 1 ${bx.toFixed(1)} ${by.toFixed(1)} L${cx.toFixed(1)} ${cy.toFixed(1)} A${Ri} ${Ri} 0 ${lg} 0 ${dx.toFixed(1)} ${dy.toFixed(1)} Z`;
  }

  const degC = (capital / total) * 360;
  const s1 = GAP / 2,     e1 = degC - GAP / 2;
  const s2 = degC + GAP / 2, e2 = 360 - GAP / 2;

  return (
    <svg viewBox="0 0 150 150" width="150" height="150" aria-hidden="true">
      {e1 > s1 && <path d={arc(s1, e1)} fill="#0F4C3A" />}
      {e2 > s2 && <path d={arc(s2, e2)} fill="#D4AF37" />}
    </svg>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = { prixInitial?: number };

// ─── Composant principal ───────────────────────────────────────────────────────
export default function CalculateurCredit({ prixInitial }: Props) {
  const bienInit   = prixInitial ?? BIEN_DEFAUT;
  const apportInit = prixInitial ? Math.round(prixInitial * 0.2) : APPORT_DEFAUT;

  const [montantBien,    setMontantBien]    = useState(bienInit);
  const [apport,         setApport]         = useState(apportInit);
  const [duree,          setDuree]          = useState(DUREE_DEFAUT_ANS);
  const [taux,           setTaux]           = useState(TAUX_DEFAUT_PCT);
  const [revenuMensuel,  setRevenuMensuel]  = useState("");

  const capital    = Math.max(0, montantBien - apport);
  const pasDeCredit = montantBien > 0 && apport >= montantBien;

  const mensualite = useMemo(
    () => calculerMensualite(capital, taux, duree),
    [capital, taux, duree],
  );
  const totalRembourse = mensualite * duree * 12;
  const totalInterets  = Math.max(0, totalRembourse - capital);
  const pctCapital     = totalRembourse > 0 ? (capital / totalRembourse) * 100 : 0;
  const pctInterets    = totalRembourse > 0 ? (totalInterets / totalRembourse) * 100 : 0;

  const revenu         = parseFloat(revenuMensuel) || 0;
  const tauxEndettement = revenu > 0 ? (mensualite / revenu) * 100 : null;

  const tableau = useMemo(
    () => calcTableau(capital, taux, duree, mensualite),
    [capital, taux, duree, mensualite],
  );

  // ── Styles réutilisables ───────────────────────────────────────────────────
  const inputCls = "border rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none";
  const inp: React.CSSProperties = {
    borderColor: "var(--bordure)",
    color: "var(--texte-corps)",
    background: "var(--fond-secondaire)",
  };
  const labelCls: React.CSSProperties = {
    color: "var(--texte-tertiaire)",
    fontSize: "0.68rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
  };
  const sliderStyle: React.CSSProperties = { accentColor: "#0F4C3A" };

  const couleurEndettement =
    tauxEndettement === null ? undefined
    : tauxEndettement < SEUIL_VERT    ? "#146C43"
    : tauxEndettement < SEUIL_ORANGE  ? "#D97706"
    : "#DC2626";

  const texteEndettement =
    tauxEndettement === null ? ""
    : tauxEndettement < SEUIL_VERT
      ? "✓ Recommandé — les banques acceptent généralement jusqu'à 33 %"
      : tauxEndettement < SEUIL_ORANGE
      ? "⚠ Limite — certaines banques acceptent jusqu'à 40 %"
      : "✗ Élevé — ce taux peut rendre l'obtention du crédit difficile";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* ── Grille principale ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-7">

        {/* ── Paramètres ──────────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-6 flex flex-col gap-5"
          style={{ background: "var(--fond-secondaire)", border: "1px solid var(--bordure)", boxShadow: "0 4px 24px rgba(15,76,58,0.06)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--primaire)" }}>
            Paramètres du prêt
          </h2>

          {/* Montant du bien */}
          <div>
            <label style={labelCls}>Montant du bien</label>
            <input
              type="range" min={100_000} max={BIEN_MAX_SLIDER} step={10_000}
              value={Math.min(montantBien, BIEN_MAX_SLIDER)}
              onChange={(e) => {
                const v = Number(e.target.value);
                setMontantBien(v);
                if (apport > v) setApport(v);
              }}
              className="w-full h-2 rounded-full cursor-pointer mt-2 mb-2"
              style={sliderStyle}
            />
            <div className="relative">
              <input
                type="number" value={montantBien} min={0} step={10_000}
                onChange={(e) => {
                  const v = Math.max(0, Number(e.target.value));
                  setMontantBien(v);
                  if (apport > v) setApport(v);
                }}
                className={inputCls} style={inp}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: "var(--texte-tertiaire)" }}>DH</span>
            </div>
          </div>

          {/* Apport personnel */}
          <div>
            <div className="flex items-baseline justify-between">
              <label style={labelCls}>Apport personnel</label>
              {montantBien > 0 && (
                <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
                  {((apport / montantBien) * 100).toFixed(0)} % du prix
                </span>
              )}
            </div>
            <input
              type="range" min={0} max={montantBien} step={10_000} value={apport}
              onChange={(e) => setApport(Number(e.target.value))}
              className="w-full h-2 rounded-full cursor-pointer mt-2 mb-2"
              style={sliderStyle}
            />
            <div className="relative">
              <input
                type="number" value={apport} min={0} max={montantBien} step={10_000}
                onChange={(e) => setApport(Math.min(montantBien, Math.max(0, Number(e.target.value))))}
                className={inputCls} style={inp}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: "var(--texte-tertiaire)" }}>DH</span>
            </div>
          </div>

          {/* Durée */}
          <div>
            <div className="flex items-baseline justify-between">
              <label style={labelCls}>Durée du prêt</label>
              <span className="text-sm font-semibold" style={{ color: "var(--primaire)" }}>{duree} ans</span>
            </div>
            <input
              type="range" min={DUREE_MIN_ANS} max={DUREE_MAX_ANS} step={1} value={duree}
              onChange={(e) => setDuree(Number(e.target.value))}
              className="w-full h-2 rounded-full cursor-pointer mt-2"
              style={sliderStyle}
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: "var(--texte-tertiaire)" }}>
              <span>{DUREE_MIN_ANS} ans</span><span>{DUREE_MAX_ANS} ans</span>
            </div>
          </div>

          {/* Taux d'intérêt */}
          <div>
            <label style={labelCls}>Taux d'intérêt annuel</label>
            <div className="relative mt-2">
              <input
                type="number" value={taux} min={0} max={15} step={0.1}
                onChange={(e) => setTaux(Math.max(0, Math.min(15, parseFloat(e.target.value) || 0)))}
                className={inputCls} style={inp}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: "var(--texte-tertiaire)" }}>%</span>
            </div>
            <p className="text-xs mt-1.5" style={{ color: "var(--texte-tertiaire)" }}>
              Taux indicatif — à ajuster selon votre banque et dossier
            </p>
          </div>

          {/* Revenu mensuel (optionnel) */}
          <div>
            <label style={labelCls}>
              Revenu mensuel net{" "}
              <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "var(--texte-tertiaire)", fontSize: "0.7rem" }}>
                (optionnel — pour le taux d'endettement)
              </span>
            </label>
            <div className="relative mt-2">
              <input
                type="number" value={revenuMensuel} min={0} step={500}
                placeholder="Ex : 15 000"
                onChange={(e) => setRevenuMensuel(e.target.value)}
                className={inputCls} style={inp}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: "var(--texte-tertiaire)" }}>DH</span>
            </div>
          </div>
        </div>

        {/* ── Résultats ─────────────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden flex flex-col"
          style={{ border: "1px solid var(--bordure)", boxShadow: "0 4px 24px rgba(15,76,58,0.06)" }}
        >
          {pasDeCredit ? (
            <div
              className="flex-1 flex flex-col items-center justify-center p-10 text-center"
              style={{ background: "var(--fond-secondaire)" }}
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: "var(--fond-vert-leger)" }}>
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#0F4C3A" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <p className="text-lg font-normal mb-2"
                style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}>
                Pas de financement nécessaire
              </p>
              <p className="text-sm" style={{ color: "var(--texte-tertiaire)" }}>
                Votre apport couvre intégralement le prix du bien.
              </p>
            </div>
          ) : (
            <>
              {/* En-tête mensualité */}
              <div
                className="px-6 py-6"
                style={{ background: "linear-gradient(135deg, #0F4C3A 0%, #146C43 100%)" }}
              >
                <p className="text-xs font-medium mb-1" style={{ color: "#A8D5B8", letterSpacing: "0.12em" }}>
                  MENSUALITÉ ESTIMÉE
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-marcellus), serif",
                    color: "#D4AF37",
                    fontSize: "clamp(1.9rem, 5vw, 2.7rem)",
                    lineHeight: 1.1,
                  }}
                >
                  {fdh(mensualite)}
                  <span className="text-base font-normal ml-1" style={{ color: "rgba(212,175,55,0.65)" }}>
                    /mois
                  </span>
                </p>
                <p className="text-xs mt-2" style={{ color: "rgba(168,213,184,0.7)" }}>
                  Pendant {duree} ans · Taux {taux} %/an
                </p>
              </div>

              {/* Corps des résultats */}
              <div className="flex-1 p-6" style={{ background: "var(--fond-secondaire)" }}>
                <div className="flex gap-5 mb-5">

                  {/* Chiffres clés */}
                  <div className="flex-1 flex flex-col gap-3.5">
                    <div>
                      <p style={labelCls}>Montant emprunté</p>
                      <p className="text-base font-semibold mt-0.5" style={{ color: "var(--primaire)" }}>
                        {fdh(capital)}
                      </p>
                    </div>
                    <div>
                      <p style={labelCls}>Total des intérêts</p>
                      <p className="text-base font-semibold mt-0.5" style={{ color: "#D4AF37" }}>
                        {fdh(totalInterets)}
                      </p>
                    </div>
                    <div>
                      <p style={labelCls}>Total remboursé</p>
                      <p className="text-base font-semibold mt-0.5" style={{ color: "var(--texte-corps)" }}>
                        {fdh(totalRembourse)}
                      </p>
                    </div>

                    {/* Légende donut */}
                    <div className="flex flex-col gap-1.5 mt-1">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: "#0F4C3A" }} />
                        <span className="text-xs" style={{ color: "var(--texte-corps)" }}>
                          Capital — {fpct(pctCapital)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: "#D4AF37" }} />
                        <span className="text-xs" style={{ color: "var(--texte-corps)" }}>
                          Intérêts — {fpct(pctInterets)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Donut */}
                  <div className="flex items-center flex-shrink-0">
                    <DonutCapitalInterets capital={capital} interets={totalInterets} />
                  </div>
                </div>

                {/* Taux d'endettement */}
                {tauxEndettement !== null && (
                  <div
                    className="pt-4 mt-1"
                    style={{ borderTop: "1px solid var(--bordure-legere)" }}
                  >
                    <p className="mb-2" style={labelCls}>Taux d'endettement</p>
                    <div className="flex items-center gap-3 mb-1.5">
                      <div
                        className="flex-1 h-2.5 rounded-full overflow-hidden"
                        style={{ background: "var(--fond-principal)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, tauxEndettement)}%`,
                            background: couleurEndettement,
                          }}
                        />
                      </div>
                      <span
                        className="text-sm font-bold flex-shrink-0"
                        style={{ color: couleurEndettement, minWidth: "4rem", textAlign: "right" }}
                      >
                        {fpct(tauxEndettement)}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: couleurEndettement }}>
                      {texteEndettement}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Tableau d'amortissement ──────────────────────────────────────────── */}
      {!pasDeCredit && capital > 0 && tableau.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden mb-6"
          style={{ border: "1px solid var(--bordure)", boxShadow: "0 2px 12px rgba(15,76,58,0.04)" }}
        >
          <div
            className="px-5 py-4"
            style={{ background: "var(--fond-secondaire)", borderBottom: "1px solid var(--bordure)" }}
          >
            <h3 className="text-sm font-semibold" style={{ color: "var(--primaire)" }}>
              Évolution du capital restant dû
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--fond-principal)" }}>
                  {["Année", "Capital restant", "Capital remboursé", "Intérêts cumulés"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left whitespace-nowrap"
                      style={{ ...labelCls, fontFamily: "inherit" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableau.map((l, i) => (
                  <tr
                    key={l.annee}
                    style={{
                      background: i % 2 === 0 ? "var(--fond-secondaire)" : "var(--fond-principal)",
                      borderBottom: "1px solid var(--bordure-legere)",
                    }}
                  >
                    <td className="px-5 py-3 text-sm font-medium" style={{ color: "var(--primaire)" }}>
                      {l.annee} an{l.annee > 1 ? "s" : ""}
                    </td>
                    <td
                      className="px-5 py-3 text-sm font-semibold"
                      style={{ color: l.capitalRestant === 0 ? "#146C43" : "var(--texte-corps)" }}
                    >
                      {l.capitalRestant === 0 ? "Soldé ✓" : fdh(l.capitalRestant)}
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: "var(--texte-corps)" }}>
                      {fdh(l.capitalRembourse)}
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: "#D4AF37" }}>
                      {fdh(l.interetsCumules)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Avertissement légal ──────────────────────────────────────────────── */}
      <div
        className="rounded-2xl px-5 py-4 flex gap-3"
        style={{ background: "var(--fond-principal)", border: "1px solid var(--bordure-legere)" }}
      >
        <svg className="flex-shrink-0 mt-0.5" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ color: "var(--texte-tertiaire)" }}>
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p className="text-xs leading-relaxed" style={{ color: "var(--texte-tertiaire)" }}>
          <strong style={{ color: "var(--texte-corps)" }}>Simulation indicative.</strong>{" "}
          Le taux et les conditions réels dépendent de votre dossier, de votre banque et du marché
          au moment de la demande. Ce calcul est fourni à titre d'information uniquement et ne
          constitue pas un engagement de financement.
        </p>
      </div>
    </div>
  );
}
