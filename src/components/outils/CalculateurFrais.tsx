"use client";

import { useState } from "react";

// ─── Barème indicatif des frais d'acquisition immobilière au Maroc ─────────────
// Sources : CGI marocain, pratiques notariales usuelles
// Ces taux sont INDICATIFS. Modifiez ici pour mettre à jour tout l'outil.
const BAREME = {
  // Droits d'enregistrement : 4 % du prix d'acquisition pour biens résidentiels
  // (art. 133 CGI — terrains constructibles : 4 %, immeubles : 4 %)
  DROITS_ENREGISTREMENT: 0.04,

  // Conservation foncière : inscription au titre foncier + timbre + certificat de propriété
  // Taux légal : ~1,5 % avec un plancher de droit
  CONSERVATION_FONCIERE_TAUX: 0.015,
  CONSERVATION_FONCIERE_MIN: 1_000, // plancher indicatif en DH

  // Honoraires du notaire — barème dégressif indicatif HT
  // (non officiel ; les honoraires sont librement négociés au Maroc)
  NOTAIRE_TRANCHES: [
    { jusquA: 500_000, taux: 0.010 },     // 1,0 % sur la première tranche
    { jusquA: 1_000_000, taux: 0.008 },   // 0,8 % de 500k à 1M
    { jusquA: 5_000_000, taux: 0.005 },   // 0,5 % de 1M à 5M
    { jusquA: Infinity, taux: 0.003 },    // 0,3 % au-delà de 5M
  ] as const,

  // TVA 10 % sur les honoraires du notaire
  TVA_HONORAIRES: 0.10,

  // Frais divers (timbres, légalisations, copies d'actes) — forfait indicatif
  FRAIS_DIVERS: 1_500,
} as const;

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formaterPrix(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " DH";
}

function formaterTaux(t: number): string {
  return (t * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " %";
}

// Honoraires notaire HT avec barème dégressif par tranches
function calculerHonorairesHT(prix: number): number {
  let honoraires = 0;
  let restant = prix;
  let borne = 0;
  for (const { jusquA, taux } of BAREME.NOTAIRE_TRANCHES) {
    if (restant <= 0) break;
    const tranche = jusquA === Infinity ? restant : Math.min(restant, jusquA - borne);
    honoraires += tranche * taux;
    restant -= tranche;
    borne = jusquA === Infinity ? borne : jusquA;
  }
  return honoraires;
}

type TypeAchat = "ancien" | "neuf";

interface ResultatFrais {
  droits: number;
  conservation: number;
  honorairesHT: number;
  tvaHonoraires: number;
  honorairesTTC: number;
  fraisDivers: number;
  totalFrais: number;
  coutTotal: number;
  tauxFrais: number; // % du prix
}

function calculer(prix: number): ResultatFrais {
  const droits = prix * BAREME.DROITS_ENREGISTREMENT;
  const conservation = Math.max(prix * BAREME.CONSERVATION_FONCIERE_TAUX, BAREME.CONSERVATION_FONCIERE_MIN);
  const honorairesHT = calculerHonorairesHT(prix);
  const tvaHonoraires = honorairesHT * BAREME.TVA_HONORAIRES;
  const honorairesTTC = honorairesHT + tvaHonoraires;
  const fraisDivers = BAREME.FRAIS_DIVERS;
  const totalFrais = droits + conservation + honorairesTTC + fraisDivers;
  const coutTotal = prix + totalFrais;
  return {
    droits, conservation, honorairesHT, tvaHonoraires,
    honorairesTTC, fraisDivers, totalFrais, coutTotal,
    tauxFrais: totalFrais / prix,
  };
}

// ─── Graphique donut SVG ────────────────────────────────────────────────────────

interface SegmentDonut {
  label: string;
  valeur: number;
  couleur: string;
}

function DonutChart({ segments }: { segments: SegmentDonut[] }) {
  const total = segments.reduce((s, x) => s + x.valeur, 0);
  if (total === 0) return null;
  const CX = 80;
  const CY = 80;
  const R = 68;
  const Ri = 46;
  const GAP = 1.6; // degrés de gap entre segments

  function arcPath(startDeg: number, endDeg: number): string {
    const toRad = (d: number) => ((d - 90) * Math.PI) / 180;
    const s = toRad(startDeg);
    const e = toRad(endDeg);
    const x1 = CX + R * Math.cos(s);
    const y1 = CY + R * Math.sin(s);
    const x2 = CX + R * Math.cos(e);
    const y2 = CY + R * Math.sin(e);
    const x3 = CX + Ri * Math.cos(e);
    const y3 = CY + Ri * Math.sin(e);
    const x4 = CX + Ri * Math.cos(s);
    const y4 = CY + Ri * Math.sin(s);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} A ${Ri} ${Ri} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`;
  }

  let cumul = 0;
  return (
    <svg viewBox="0 0 160 160" width="160" height="160" aria-hidden="true">
      {segments.map((seg) => {
        const angleDeg = (seg.valeur / total) * 360;
        const startDeg = cumul + GAP / 2;
        const endDeg = cumul + angleDeg - GAP / 2;
        cumul += angleDeg;
        if (endDeg <= startDeg) return null;
        return (
          <path key={seg.label} d={arcPath(startDeg, endDeg)} fill={seg.couleur} />
        );
      })}
    </svg>
  );
}

// ─── Ligne de frais ─────────────────────────────────────────────────────────────

function LigneFrais({
  icone, label, detail, montant, couleurPuce,
}: {
  icone: React.ReactNode;
  label: string;
  detail: string;
  montant: number;
  couleurPuce: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3" style={{ borderBottom: "1px solid var(--bordure-legere)" }}>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: couleurPuce + "1A" }}
      >
        <span style={{ color: couleurPuce }}>{icone}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: "var(--texte-corps)" }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--texte-tertiaire)" }}>{detail}</p>
      </div>
      <p className="text-sm font-semibold flex-shrink-0" style={{ color: "var(--texte-corps)" }}>
        {formaterPrix(montant)}
      </p>
    </div>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────────

export default function CalculateurFrais({ prixInitial }: { prixInitial?: number }) {
  const [prixBrut, setPrixBrut] = useState(prixInitial ? String(prixInitial) : "");
  const [typeAchat, setTypeAchat] = useState<TypeAchat>("ancien");
  const [residencePrincipale, setResidencePrincipale] = useState(false);

  const prix = parseFloat(prixBrut.replace(/\s/g, "")) || 0;
  const res = prix >= 1000 ? calculer(prix) : null;

  const segmentsDonut: SegmentDonut[] = res
    ? [
        { label: "Prix du bien", valeur: prix, couleur: "#0F4C3A" },
        { label: "Droits d'enregistrement", valeur: res.droits, couleur: "#D4AF37" },
        { label: "Conservation foncière", valeur: res.conservation, couleur: "#146C43" },
        { label: "Honoraires notaire", valeur: res.honorairesTTC, couleur: "#B8975F" },
        { label: "Frais divers", valeur: res.fraisDivers, couleur: "#9DB8AD" },
      ]
    : [];

  const inp: React.CSSProperties = {
    borderColor: "var(--bordure)",
    color: "var(--texte-corps)",
    background: "var(--fond-secondaire)",
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">

      {/* ── Saisie ─────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 mb-6"
        style={{ background: "var(--fond-secondaire)", border: "1px solid var(--bordure)", boxShadow: "0 4px 20px rgba(15,76,58,0.07)" }}
      >
        {/* Prix */}
        <div className="mb-5">
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--texte-corps)" }}>
            Prix du bien
          </label>
          <div className="relative">
            <input
              type="number"
              value={prixBrut}
              onChange={(e) => setPrixBrut(e.target.value)}
              placeholder="Ex : 1500000"
              min="0"
              step="1000"
              className="w-full border rounded-xl pl-4 pr-16 py-3.5 text-lg focus:outline-none focus:ring-2 focus:ring-[var(--primaire)]"
              style={{ ...inp, fontFamily: "var(--font-outfit), sans-serif" }}
              aria-label="Prix du bien en dirhams"
            />
            <span
              className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold"
              style={{ color: "var(--texte-tertiaire)" }}
            >
              DH
            </span>
          </div>
          {prix > 0 && (
            <p className="text-xs mt-1.5" style={{ color: "var(--texte-tertiaire)" }}>
              {formaterPrix(prix)}
            </p>
          )}
        </div>

        {/* Type d'achat */}
        <div className="mb-5">
          <p className="text-sm font-medium mb-2" style={{ color: "var(--texte-corps)" }}>Type d'achat</p>
          <div className="flex gap-2">
            {(["ancien", "neuf"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeAchat(t)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border cursor-pointer transition-all"
                style={
                  typeAchat === t
                    ? { background: "var(--primaire)", color: "var(--fond-secondaire)", borderColor: "var(--primaire)" }
                    : { background: "transparent", color: "var(--texte-corps)", borderColor: "var(--bordure)" }
                }
              >
                {t === "ancien" ? "Ancien" : "Neuf / VEFA"}
              </button>
            ))}
          </div>
          {typeAchat === "neuf" && (
            <p className="text-xs mt-2 px-3 py-2 rounded-lg" style={{ background: "var(--fond-accent)", color: "var(--texte-chaud)" }}>
              Pour le neuf, la TVA 20 % est généralement incluse dans le prix promoteur. Les droits d'enregistrement s'appliquent sur le prix d'acquisition. Vérifiez avec votre notaire.
            </p>
          )}
        </div>

        {/* Résidence principale */}
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => setResidencePrincipale((v) => !v)}
            className="w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center mt-0.5 cursor-pointer transition-all"
            style={residencePrincipale
              ? { background: "var(--primaire)", borderColor: "var(--primaire)" }
              : { background: "transparent", borderColor: "var(--bordure)" }}
            role="checkbox"
            aria-checked={residencePrincipale}
          >
            {residencePrincipale && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 5L4 7.5L8.5 2" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            )}
          </button>
          <div>
            <p className="text-sm" style={{ color: "var(--texte-corps)" }}>Résidence principale / Premier achat</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--texte-tertiaire)" }}>
              Des exonérations peuvent s'appliquer selon votre situation personnelle — consultez votre notaire.
            </p>
          </div>
        </div>
      </div>

      {/* ── Résultats ──────────────────────────────────────────────────────── */}
      {res ? (
        <div
          className="rounded-2xl overflow-hidden mb-6"
          style={{ border: "1px solid var(--bordure)", boxShadow: "0 4px 20px rgba(15,76,58,0.07)" }}
        >
          {/* En-tête résultats */}
          <div className="px-6 py-4" style={{ background: "linear-gradient(135deg, #0F4C3A 0%, #146C43 100%)" }}>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#A8D5B8", letterSpacing: "0.15em" }}>
              Estimation des frais
            </p>
            <p className="text-2xl" style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--accent)" }}>
              {formaterPrix(res.totalFrais)}
            </p>
            <p className="text-xs mt-1" style={{ color: "#A8D5B8" }}>
              soit {formaterTaux(res.tauxFrais)} du prix du bien
            </p>
          </div>

          {/* Décomposition + graphique */}
          <div className="p-6" style={{ background: "var(--fond-secondaire)" }}>
            <div className="flex flex-col md:flex-row gap-8 items-start">

              {/* Lignes de frais */}
              <div className="flex-1 w-full">
                <LigneFrais
                  icone={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
                    </svg>
                  }
                  label="Droits d'enregistrement"
                  detail={`${formaterTaux(BAREME.DROITS_ENREGISTREMENT)} du prix`}
                  montant={res.droits}
                  couleurPuce="#D4AF37"
                />
                <LigneFrais
                  icone={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                    </svg>
                  }
                  label="Conservation foncière"
                  detail={`${formaterTaux(BAREME.CONSERVATION_FONCIERE_TAUX)} du prix (inscription + certificat)`}
                  montant={res.conservation}
                  couleurPuce="#146C43"
                />
                <LigneFrais
                  icone={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
                    </svg>
                  }
                  label="Honoraires notaire (HT)"
                  detail={`Barème dégressif — ${formaterPrix(res.honorairesHT)} HT`}
                  montant={res.honorairesHT}
                  couleurPuce="#B8975F"
                />
                <LigneFrais
                  icone={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  }
                  label="TVA sur honoraires"
                  detail={`${formaterTaux(BAREME.TVA_HONORAIRES)} sur les honoraires HT`}
                  montant={res.tvaHonoraires}
                  couleurPuce="#B8975F"
                />
                <LigneFrais
                  icone={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
                    </svg>
                  }
                  label="Frais divers"
                  detail="Timbres, copies d'actes, légalisations (forfait)"
                  montant={res.fraisDivers}
                  couleurPuce="#9DB8AD"
                />

                {/* Total frais */}
                <div
                  className="flex items-center justify-between py-3 px-4 rounded-xl mt-3"
                  style={{ background: "rgba(212,175,55,0.10)", border: "1px solid rgba(212,175,55,0.3)" }}
                >
                  <p className="text-sm font-semibold" style={{ color: "var(--texte-corps)" }}>
                    Total des frais d'acquisition
                  </p>
                  <p className="text-base font-bold" style={{ color: "#D4AF37" }}>
                    {formaterPrix(res.totalFrais)}
                  </p>
                </div>
              </div>

              {/* Graphique donut */}
              <div className="flex flex-col items-center gap-3 md:flex-shrink-0">
                <DonutChart segments={segmentsDonut} />
                <div className="flex flex-col gap-1.5 text-xs w-full md:w-44">
                  {segmentsDonut.map((s) => (
                    <div key={s.label} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: s.couleur }} />
                      <span style={{ color: "var(--texte-tertiaire)" }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Coût total */}
            <div
              className="mt-6 rounded-2xl px-6 py-5"
              style={{ background: "linear-gradient(135deg, #0F4C3A 0%, #146C43 100%)" }}
            >
              <p className="text-xs mb-1" style={{ color: "#A8D5B8" }}>Coût total réel de l'acquisition</p>
              <p
                className="text-3xl leading-none"
                style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--accent)" }}
              >
                {formaterPrix(res.coutTotal)}
              </p>
              <p className="text-xs mt-2 flex items-center gap-3" style={{ color: "#A8D5B8" }}>
                <span>Prix du bien : {formaterPrix(prix)}</span>
                <span style={{ color: "rgba(255,255,255,0.3)" }}>+</span>
                <span>Frais : {formaterPrix(res.totalFrais)}</span>
              </p>
            </div>
          </div>
        </div>
      ) : prixBrut && prix < 1000 ? (
        <div className="rounded-2xl px-6 py-5 mb-6 text-center text-sm"
          style={{ background: "var(--fond-secondaire)", border: "1px solid var(--bordure)", color: "var(--texte-tertiaire)" }}>
          Saisissez un prix supérieur à 1 000 DH.
        </div>
      ) : null}

      {/* ── Avertissement légal ─────────────────────────────────────────────── */}
      <div
        className="rounded-xl px-5 py-4 flex gap-3"
        style={{ background: "var(--fond-accent)", border: "1px solid #E0DAC8" }}
      >
        <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="#B8975F" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: "#B8975F" }}>Estimation indicative</p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--texte-tertiaire)" }}>
            Ces calculs sont fournis à titre indicatif. Les frais réels dépendent de votre situation personnelle,
            de la nature du bien, des éventuelles exonérations applicables et des honoraires négociés avec votre notaire.
            Consultez un notaire agréé au Maroc avant toute décision.
          </p>
        </div>
      </div>
    </div>
  );
}
