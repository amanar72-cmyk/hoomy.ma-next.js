"use client";

import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type VisiteConfirmee = {
  id: string;
  date_confirmee: string;
  nom_client: string;
  telephone_client: string | null;
  email_client: string;
  bien_titre: string;
  bien_reference: string | null;
  bien_ville: string;
};

// ── Utilitaires calendrier ────────────────────────────────────────────────────

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function debutDuMois(annee: number, mois: number): Date {
  return new Date(annee, mois, 1);
}

function finDuMois(annee: number, mois: number): Date {
  return new Date(annee, mois + 1, 0);
}

// Lundi = 0, ..., Dimanche = 6
function jourSemaine(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function formaterDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formaterHeure(dateISO: string): string {
  const d = new Date(dateISO);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("fr-MA", { hour: "2-digit", minute: "2-digit" });
}

function formaterDateLong(dateISO: string): string {
  return new Date(dateISO).toLocaleDateString("fr-MA", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

// ── Composant ─────────────────────────────────────────────────────────────────

export default function CalendrierVisites({
  visites,
}: {
  visites: VisiteConfirmee[];
}) {
  const maintenant = new Date();
  const [moisAffiche, setMoisAffiche] = useState(
    new Date(maintenant.getFullYear(), maintenant.getMonth(), 1)
  );
  const [jourSelectionne, setJourSelectionne] = useState<string | null>(null);

  const annee = moisAffiche.getFullYear();
  const mois  = moisAffiche.getMonth();

  // Index des visites par date YYYY-MM-DD
  const visitesParJour: Record<string, VisiteConfirmee[]> = {};
  for (const v of visites) {
    if (!v.date_confirmee) continue;
    const cle = v.date_confirmee.split("T")[0];
    if (!visitesParJour[cle]) visitesParJour[cle] = [];
    visitesParJour[cle].push(v);
  }

  // Cellules du calendrier
  const premier = debutDuMois(annee, mois);
  const dernier = finDuMois(annee, mois);
  const decalage = jourSemaine(premier);
  const totalCellules = decalage + dernier.getDate();
  const nbRangees = Math.ceil(totalCellules / 7);

  function moisPrecedent() {
    setMoisAffiche(new Date(annee, mois - 1, 1));
    setJourSelectionne(null);
  }
  function moisSuivant() {
    setMoisAffiche(new Date(annee, mois + 1, 1));
    setJourSelectionne(null);
  }

  // Prochaines visites (à venir, triées)
  const aujISO = formaterDateISO(maintenant);
  const prochaines = visites
    .filter((v) => v.date_confirmee && v.date_confirmee.split("T")[0] >= aujISO)
    .sort((a, b) => a.date_confirmee.localeCompare(b.date_confirmee))
    .slice(0, 6);

  const visitesJourSelectionne = jourSelectionne ? (visitesParJour[jourSelectionne] ?? []) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* ── Calendrier ────────────────────────────────────────────────────── */}
      <div
        className="lg:col-span-2 rounded-2xl p-5"
        style={{ background: "#fff", border: "1px solid #F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.06)" }}
      >
        {/* Navigation mois */}
        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            onClick={moisPrecedent}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity"
            style={{ background: "#F0EDE5", color: "#0F4C3A" }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <h2 className="text-base font-semibold" style={{ color: "#0F4C3A" }}>
            {MOIS[mois]} {annee}
          </h2>

          <button
            type="button"
            onClick={moisSuivant}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity"
            style={{ background: "#F0EDE5", color: "#0F4C3A" }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Jours de la semaine */}
        <div className="grid grid-cols-7 mb-2">
          {JOURS.map((j) => (
            <div key={j} className="text-center text-xs font-medium py-1" style={{ color: "#9DB8AD" }}>
              {j}
            </div>
          ))}
        </div>

        {/* Grille */}
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: nbRangees * 7 }).map((_, i) => {
            const jour = i - decalage + 1;
            if (jour < 1 || jour > dernier.getDate()) {
              return <div key={i} />;
            }

            const dateISO = `${annee}-${String(mois + 1).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
            const aVisite = Boolean(visitesParJour[dateISO]);
            const estAujourdhui = dateISO === aujISO;
            const estSelectionne = dateISO === jourSelectionne;

            return (
              <button
                key={i}
                type="button"
                onClick={() => setJourSelectionne(estSelectionne ? null : dateISO)}
                className="relative flex flex-col items-center justify-center rounded-xl py-2 cursor-pointer transition-all"
                style={{
                  background: estSelectionne
                    ? "#0F4C3A"
                    : estAujourdhui
                      ? "#F0FAF4"
                      : "transparent",
                  minHeight: 44,
                }}
              >
                <span
                  className="text-sm font-medium"
                  style={{
                    color: estSelectionne ? "#fff" : estAujourdhui ? "#0F4C3A" : "#1f2a24",
                    fontWeight: estAujourdhui || aVisite ? 600 : 400,
                  }}
                >
                  {jour}
                </span>
                {aVisite && (
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-0.5"
                    style={{ background: estSelectionne ? "#D4AF37" : "#0F4C3A" }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Détail du jour sélectionné */}
        {jourSelectionne && visitesJourSelectionne.length > 0 && (
          <div
            className="mt-5 rounded-xl p-4 flex flex-col gap-3"
            style={{ background: "#F0FAF4", border: "1px solid #D1FAE5" }}
          >
            <p className="text-xs font-semibold capitalize" style={{ color: "#0F4C3A" }}>
              {formaterDateLong(jourSelectionne)}
            </p>
            {visitesJourSelectionne.map((v) => (
              <div
                key={v.id}
                className="flex gap-3 items-start"
                style={{ borderTop: "1px solid #C6E8D4", paddingTop: 10 }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: "#0F4C3A", color: "#D4AF37" }}
                >
                  {v.nom_client[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "#0F4C3A" }}>
                    {v.bien_titre}
                    {v.bien_reference && (
                      <span className="ml-2 text-xs font-mono font-normal" style={{ color: "#9DB8AD" }}>
                        {v.bien_reference}
                      </span>
                    )}
                  </p>
                  <p className="text-xs" style={{ color: "#6B7A71" }}>
                    {v.nom_client}
                    {formaterHeure(v.date_confirmee) && ` · ${formaterHeure(v.date_confirmee)}`}
                    {v.bien_ville && ` · ${v.bien_ville}`}
                  </p>
                  <div className="flex gap-3 mt-0.5">
                    <a href={`mailto:${v.email_client}`} className="text-xs" style={{ color: "#9DB8AD" }}>
                      {v.email_client}
                    </a>
                    {v.telephone_client && (
                      <a href={`tel:${v.telephone_client}`} className="text-xs" style={{ color: "#9DB8AD" }}>
                        {v.telephone_client}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Prochaines visites ────────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: "#0F4C3A" }}>
          Prochaines visites
        </h3>

        {prochaines.length === 0 ? (
          <div
            className="rounded-2xl flex flex-col items-center py-10 text-center px-4"
            style={{ background: "#fff", border: "1px solid #F0EDE5" }}
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#C4D8CE" strokeWidth="1.5" className="mb-3">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <p className="text-xs" style={{ color: "#C4D8CE" }}>Aucune visite à venir</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {prochaines.map((v) => {
              const dateAff = new Date(v.date_confirmee);
              const jourNum = dateAff.getDate();
              const moisAbb = dateAff.toLocaleDateString("fr-MA", { month: "short" });
              return (
                <div
                  key={v.id}
                  className="rounded-2xl p-4 flex gap-3"
                  style={{ background: "#fff", border: "1px solid #F0EDE5", boxShadow: "0 1px 8px rgba(15,76,58,0.04)" }}
                >
                  {/* Badge date */}
                  <div
                    className="flex flex-col items-center justify-center rounded-xl flex-shrink-0 px-3"
                    style={{ background: "#F0FAF4", minWidth: 48 }}
                  >
                    <span className="text-xl font-bold leading-tight" style={{ color: "#0F4C3A" }}>{jourNum}</span>
                    <span className="text-xs capitalize" style={{ color: "#9DB8AD" }}>{moisAbb}</span>
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold line-clamp-1 leading-snug" style={{ color: "#1f2a24" }}>
                      {v.bien_titre}
                    </p>
                    <p className="text-xs" style={{ color: "#9DB8AD" }}>
                      {v.nom_client}
                      {formaterHeure(v.date_confirmee) && ` · ${formaterHeure(v.date_confirmee)}`}
                    </p>
                    {v.telephone_client && (
                      <a
                        href={`tel:${v.telephone_client}`}
                        className="text-xs"
                        style={{ color: "#0F4C3A", textDecoration: "none" }}
                      >
                        {v.telephone_client}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
