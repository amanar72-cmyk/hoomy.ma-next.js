"use client";

import { useState } from "react";
import { calculerFraisAcquisition, formaterDH, type ResultatFrais } from "@/lib/fraisAcquisition";

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function pct(n: number) {
  return (n * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " %";
}

// ─── Graphique donut SVG ──────────────────────────────────────────────────────────

interface SegmentDonut { label: string; valeur: number; couleur: string }

function DonutChart({ segments }: { segments: SegmentDonut[] }) {
  const total = segments.reduce((s, x) => s + x.valeur, 0);
  if (total === 0) return null;
  const CX = 80, CY = 80, R = 68, Ri = 46, GAP = 1.6;

  function arc(s0: number, e0: number): string {
    const r = (d: number) => ((d - 90) * Math.PI) / 180;
    const [s, e] = [r(s0), r(e0)];
    const pts = (ang: number, rad: number) => [CX + rad * Math.cos(ang), CY + rad * Math.sin(ang)];
    const [ax, ay] = pts(s, R); const [bx, by] = pts(e, R);
    const [cx, cy] = pts(e, Ri); const [dx, dy] = pts(s, Ri);
    const lg = e0 - s0 > 180 ? 1 : 0;
    return `M ${ax.toFixed(2)} ${ay.toFixed(2)} A ${R} ${R} 0 ${lg} 1 ${bx.toFixed(2)} ${by.toFixed(2)} L ${cx.toFixed(2)} ${cy.toFixed(2)} A ${Ri} ${Ri} 0 ${lg} 0 ${dx.toFixed(2)} ${dy.toFixed(2)} Z`;
  }

  let cumul = 0;
  return (
    <svg viewBox="0 0 160 160" width="160" height="160" aria-hidden="true">
      {segments.map((seg) => {
        const deg = (seg.valeur / total) * 360;
        const [s, e] = [cumul + GAP / 2, cumul + deg - GAP / 2];
        cumul += deg;
        return e > s ? <path key={seg.label} d={arc(s, e)} fill={seg.couleur} /> : null;
      })}
    </svg>
  );
}

// ─── Ligne de frais ───────────────────────────────────────────────────────────────

function LigneFrais({ icone, label, detail, montant, couleur }: {
  icone: React.ReactNode; label: string; detail: string; montant: number; couleur: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3" style={{ borderBottom: "1px solid var(--bordure-legere)" }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: couleur + "1A" }}>
        <span style={{ color: couleur }}>{icone}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: "var(--texte-corps)" }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--texte-tertiaire)" }}>{detail}</p>
      </div>
      <p className="text-sm font-semibold flex-shrink-0" style={{ color: "var(--texte-corps)" }}>
        {formaterDH(montant)}
      </p>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────────

export default function CalculateurFrais({ prixInitial }: { prixInitial?: number }) {
  const [prixBrut, setPrixBrut] = useState(prixInitial ? String(prixInitial) : "");
  const [typeAchat, setTypeAchat] = useState<"ancien" | "neuf">("ancien");
  const [residencePrincipale, setResidencePrincipale] = useState(false);

  const prix = parseFloat(prixBrut.replace(/\s/g, "")) || 0;
  const res: ResultatFrais | null = prix >= 1000 ? calculerFraisAcquisition(prix) : null;

  const segments: SegmentDonut[] = res ? [
    { label: "Prix du bien",              valeur: prix,               couleur: "#0F4C3A" },
    { label: "Droits d'enregistrement",   valeur: res.droits,         couleur: "#D4AF37" },
    { label: "Conservation foncière",     valeur: res.conservation,   couleur: "#146C43" },
    { label: "Honoraires notaire",        valeur: res.honorairesTTC,  couleur: "#B8975F" },
    { label: "Frais divers",              valeur: res.fraisDivers,    couleur: "#9DB8AD" },
  ] : [];

  const inp: React.CSSProperties = { borderColor: "var(--bordure)", color: "var(--texte-corps)", background: "var(--fond-secondaire)" };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">

      {/* ── Saisie ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-6 mb-6"
        style={{ background: "var(--fond-secondaire)", border: "1px solid var(--bordure)", boxShadow: "0 4px 20px rgba(15,76,58,0.07)" }}>

        <div className="mb-5">
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--texte-corps)" }}>
            Prix du bien
          </label>
          <div className="relative">
            <input
              type="number" value={prixBrut} onChange={(e) => setPrixBrut(e.target.value)}
              placeholder="Ex : 1 500 000" min="0" step="1000"
              className="w-full border rounded-xl pl-4 pr-14 py-3.5 text-lg focus:outline-none"
              style={{ ...inp, fontFamily: "var(--font-outfit), sans-serif" }}
              aria-label="Prix du bien en dirhams"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold"
              style={{ color: "var(--texte-tertiaire)" }}>DH</span>
          </div>
          {prix > 0 && (
            <p className="text-xs mt-1.5" style={{ color: "var(--texte-tertiaire)" }}>{formaterDH(prix)}</p>
          )}
        </div>

        <div className="mb-5">
          <p className="text-sm font-medium mb-2" style={{ color: "var(--texte-corps)" }}>Type d'achat</p>
          <div className="flex gap-2">
            {(["ancien", "neuf"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTypeAchat(t)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border cursor-pointer transition-all"
                style={typeAchat === t
                  ? { background: "var(--primaire)", color: "var(--fond-secondaire)", borderColor: "var(--primaire)" }
                  : { background: "transparent", color: "var(--texte-corps)", borderColor: "var(--bordure)" }}>
                {t === "ancien" ? "Ancien" : "Neuf / VEFA"}
              </button>
            ))}
          </div>
          {typeAchat === "neuf" && (
            <p className="text-xs mt-2 px-3 py-2 rounded-lg"
              style={{ background: "var(--fond-accent)", color: "var(--texte-chaud)" }}>
              Pour le neuf, la TVA 20 % est généralement incluse dans le prix promoteur. Les droits d'enregistrement s'appliquent sur le prix d'acquisition. Vérifiez avec votre notaire.
            </p>
          )}
        </div>

        <div className="flex items-start gap-3">
          <button type="button" onClick={() => setResidencePrincipale((v) => !v)}
            className="w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center mt-0.5 cursor-pointer transition-all"
            style={residencePrincipale
              ? { background: "var(--primaire)", borderColor: "var(--primaire)" }
              : { background: "transparent", borderColor: "var(--bordure)" }}
            role="checkbox" aria-checked={residencePrincipale}>
            {residencePrincipale && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 5L4 7.5L8.5 2" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            )}
          </button>
          <div>
            <p className="text-sm" style={{ color: "var(--texte-corps)" }}>Résidence principale / Premier achat</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--texte-tertiaire)" }}>
              Des exonérations peuvent s'appliquer selon votre situation — consultez votre notaire.
            </p>
          </div>
        </div>
      </div>

      {/* ── Résultats ──────────────────────────────────────────────────────── */}
      {res ? (
        <div className="rounded-2xl overflow-hidden mb-6"
          style={{ border: "1px solid var(--bordure)", boxShadow: "0 4px 20px rgba(15,76,58,0.07)" }}>

          <div className="px-6 py-4" style={{ background: "linear-gradient(135deg, #0F4C3A 0%, #146C43 100%)" }}>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#A8D5B8", letterSpacing: "0.15em" }}>
              Estimation des frais
            </p>
            <p className="text-2xl" style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--accent)" }}>
              {formaterDH(res.totalFrais)}
            </p>
            <p className="text-xs mt-1" style={{ color: "#A8D5B8" }}>
              soit {pct(res.tauxFrais)} du prix du bien
            </p>
          </div>

          <div className="p-6" style={{ background: "var(--fond-secondaire)" }}>
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-1 w-full">
                <LigneFrais icone={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>}
                  label="Droits d'enregistrement" detail={`${pct(0.04)} du prix`}
                  montant={res.droits} couleur="#D4AF37" />
                <LigneFrais icone={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
                  label="Conservation foncière" detail={`${pct(0.015)} du prix (inscription + certificat)`}
                  montant={res.conservation} couleur="#146C43" />
                <LigneFrais icone={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>}
                  label="Honoraires notaire (HT)" detail={`Barème dégressif — ${formaterDH(res.honorairesHT)} HT`}
                  montant={res.honorairesHT} couleur="#B8975F" />
                <LigneFrais icone={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>}
                  label="TVA sur honoraires" detail={`${pct(0.10)} sur les honoraires HT`}
                  montant={res.tvaHonoraires} couleur="#B8975F" />
                <LigneFrais icone={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/></svg>}
                  label="Frais divers" detail="Timbres, copies d'actes, légalisations (forfait)"
                  montant={res.fraisDivers} couleur="#9DB8AD" />

                <div className="flex items-center justify-between py-3 px-4 rounded-xl mt-3"
                  style={{ background: "rgba(212,175,55,0.10)", border: "1px solid rgba(212,175,55,0.3)" }}>
                  <p className="text-sm font-semibold" style={{ color: "var(--texte-corps)" }}>Total des frais d'acquisition</p>
                  <p className="text-base font-bold" style={{ color: "#D4AF37" }}>{formaterDH(res.totalFrais)}</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3 md:flex-shrink-0">
                <DonutChart segments={segments} />
                <div className="flex flex-col gap-1.5 text-xs w-full md:w-44">
                  {segments.map((s) => (
                    <div key={s.label} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: s.couleur }} />
                      <span style={{ color: "var(--texte-tertiaire)" }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl px-6 py-5"
              style={{ background: "linear-gradient(135deg, #0F4C3A 0%, #146C43 100%)" }}>
              <p className="text-xs mb-1" style={{ color: "#A8D5B8" }}>Coût total réel de l'acquisition</p>
              <p className="text-3xl leading-none"
                style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--accent)" }}>
                {formaterDH(res.coutTotal)}
              </p>
              <p className="text-xs mt-2 flex items-center gap-3" style={{ color: "#A8D5B8" }}>
                <span>Prix : {formaterDH(prix)}</span>
                <span style={{ color: "rgba(255,255,255,0.3)" }}>+</span>
                <span>Frais : {formaterDH(res.totalFrais)}</span>
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
      <div className="rounded-xl px-5 py-4 flex gap-3"
        style={{ background: "var(--fond-accent)", border: "1px solid #E0DAC8" }}>
        <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B8975F" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: "#B8975F" }}>Estimation indicative</p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--texte-tertiaire)" }}>
            Ces calculs sont fournis à titre indicatif. Les frais réels dépendent de votre situation personnelle,
            des éventuelles exonérations et des honoraires négociés avec votre notaire.
            Consultez un notaire agréé au Maroc avant toute décision.
          </p>
        </div>
      </div>
    </div>
  );
}
