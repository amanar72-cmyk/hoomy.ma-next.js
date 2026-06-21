"use client";

import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type VisiteAdmin = {
  id: string;
  date_confirmee: string;
  nom_client: string;
  telephone_client: string | null;
  email_client: string;
  bien_titre: string;
  bien_reference: string | null;
  bien_ville: string;
  agent_id: string | null;
  agent_nom: string;
};

export type AgentInfo = {
  id: string;
  nom: string;
  couleur: string;
};

// ── Palette de couleurs par agent ─────────────────────────────────────────────

const COULEURS_PALETTE = [
  "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#10B981",
  "#F97316", "#EC4899", "#06B6D4", "#84CC16", "#6366F1",
];

// ── Utilitaires calendrier ────────────────────────────────────────────────────

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MOIS_LABELS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function jourSemaine(d: Date) { return (d.getDay() + 6) % 7; }
function finDuMois(a: number, m: number) { return new Date(a, m + 1, 0); }
function isoDate(d: Date) { return d.toISOString().split("T")[0]; }

function formaterDateCourte(iso: string) {
  return new Date(iso).toLocaleDateString("fr-MA", { day: "2-digit", month: "short" });
}

function formaterDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("fr-MA", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function debutSemaine(d: Date) {
  const dep = new Date(d);
  const jour = (dep.getDay() + 6) % 7;
  dep.setDate(dep.getDate() - jour);
  return dep;
}

function finSemaine(d: Date) {
  const fin = debutSemaine(d);
  fin.setDate(fin.getDate() + 6);
  return fin;
}

// ── Composant ─────────────────────────────────────────────────────────────────

export default function CalendrierAdmin({
  visites,
  agents,
}: {
  visites: VisiteAdmin[];
  agents: AgentInfo[];
}) {
  const maintenant = new Date();
  const [moisAffiche, setMoisAffiche] = useState(
    new Date(maintenant.getFullYear(), maintenant.getMonth(), 1)
  );
  const [agentFiltre, setAgentFiltre] = useState<string>("tous");
  const [jourSelectionne, setJourSelectionne] = useState<string | null>(null);

  // Couleur par agent_id
  const couleurAgent: Record<string, string> = {};
  agents.forEach((a, i) => {
    couleurAgent[a.id] = COULEURS_PALETTE[i % COULEURS_PALETTE.length];
  });

  // Filtrage
  const visitesFiltrees = agentFiltre === "tous"
    ? visites
    : visites.filter((v) => v.agent_id === agentFiltre);

  // Calendrier
  const annee = moisAffiche.getFullYear();
  const mois  = moisAffiche.getMonth();
  const premier = new Date(annee, mois, 1);
  const dernier = finDuMois(annee, mois);
  const decalage = jourSemaine(premier);
  const nbRangees = Math.ceil((decalage + dernier.getDate()) / 7);

  const visitesParJour: Record<string, VisiteAdmin[]> = {};
  for (const v of visitesFiltrees) {
    if (!v.date_confirmee) continue;
    const cle = v.date_confirmee.split("T")[0];
    if (!visitesParJour[cle]) visitesParJour[cle] = [];
    visitesParJour[cle].push(v);
  }

  const aujISO = isoDate(maintenant);
  const debSemaine = isoDate(debutSemaine(maintenant));
  const finSemISO  = isoDate(finSemaine(maintenant));
  const debMoisISO = `${annee}-${String(mois + 1).padStart(2, "0")}-01`;
  const finMoisISO = isoDate(dernier);

  const countSemaine = visitesFiltrees.filter(
    (v) => v.date_confirmee >= debSemaine && v.date_confirmee <= finSemISO
  ).length;
  const countMois = visitesFiltrees.filter(
    (v) => v.date_confirmee >= debMoisISO && v.date_confirmee <= finMoisISO
  ).length;

  // Prochaines visites
  const prochaines = visitesFiltrees
    .filter((v) => v.date_confirmee >= aujISO)
    .sort((a, b) => a.date_confirmee.localeCompare(b.date_confirmee))
    .slice(0, 8);

  const visitesJourSelectionne = jourSelectionne ? (visitesParJour[jourSelectionne] ?? []) : [];

  return (
    <div className="flex flex-col gap-6">

      {/* ── Stats + filtre ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4 flex-wrap">
          {[
            { label: "Cette semaine", value: countSemaine },
            { label: `${MOIS_LABELS[mois]}`, value: countMois },
            { label: "Total filtré",   value: visitesFiltrees.length },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl px-5 py-3 flex flex-col"
              style={{ background: "#fff", border: "1px solid #F0EDE5" }}
            >
              <span className="text-2xl font-bold" style={{ color: "#0F4C3A" }}>{s.value}</span>
              <span className="text-xs" style={{ color: "#9DB8AD" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Filtre agent */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium" style={{ color: "#6B7A71" }}>Agent :</label>
          <select
            value={agentFiltre}
            onChange={(e) => { setAgentFiltre(e.target.value); setJourSelectionne(null); }}
            className="border rounded-xl px-3 py-2 text-sm focus:outline-none"
            style={{ borderColor: "#E0DAC8", color: "#0F4C3A", background: "#fff" }}
          >
            <option value="tous">Tous les agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.nom}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Légende agents ───────────────────────────────────────────────── */}
      {agentFiltre === "tous" && agents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {agents.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => { setAgentFiltre(a.id); setJourSelectionne(null); }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
              style={{ background: couleurAgent[a.id] + "20", color: couleurAgent[a.id], border: `1px solid ${couleurAgent[a.id]}40` }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: couleurAgent[a.id] }} />
              {a.nom}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Calendrier ────────────────────────────────────────────────── */}
        <div
          className="lg:col-span-2 rounded-2xl p-5"
          style={{ background: "#fff", border: "1px solid #F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.06)" }}
        >
          {/* Navigation */}
          <div className="flex items-center justify-between mb-5">
            <button
              type="button"
              onClick={() => { setMoisAffiche(new Date(annee, mois - 1, 1)); setJourSelectionne(null); }}
              className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity"
              style={{ background: "#F0EDE5", color: "#0F4C3A" }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <h2 className="text-base font-semibold" style={{ color: "#0F4C3A" }}>
              {MOIS_LABELS[mois]} {annee}
            </h2>
            <button
              type="button"
              onClick={() => { setMoisAffiche(new Date(annee, mois + 1, 1)); setJourSelectionne(null); }}
              className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity"
              style={{ background: "#F0EDE5", color: "#0F4C3A" }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Jours semaine */}
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
              if (jour < 1 || jour > dernier.getDate()) return <div key={i} />;

              const dateISO = `${annee}-${String(mois + 1).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
              const visitesJour = visitesParJour[dateISO] ?? [];
              const estAujourdhui = dateISO === aujISO;
              const estSelectionne = dateISO === jourSelectionne;

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setJourSelectionne(estSelectionne ? null : dateISO)}
                  className="relative flex flex-col items-center justify-start rounded-xl py-1.5 cursor-pointer transition-all"
                  style={{
                    background: estSelectionne ? "#0F4C3A" : estAujourdhui ? "#F0FAF4" : "transparent",
                    minHeight: 52,
                  }}
                >
                  <span
                    className="text-xs font-medium mb-0.5"
                    style={{
                      color: estSelectionne ? "#fff" : estAujourdhui ? "#0F4C3A" : "#1f2a24",
                      fontWeight: estAujourdhui || visitesJour.length > 0 ? 600 : 400,
                    }}
                  >
                    {jour}
                  </span>
                  {/* Dots de couleur par agent */}
                  {visitesJour.length > 0 && (
                    <div className="flex gap-0.5 flex-wrap justify-center px-1">
                      {visitesJour.slice(0, 3).map((v, vi) => (
                        <span
                          key={vi}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: estSelectionne ? "#D4AF37" : (couleurAgent[v.agent_id ?? ""] ?? "#0F4C3A") }}
                          title={v.agent_nom}
                        />
                      ))}
                      {visitesJour.length > 3 && (
                        <span className="text-xs leading-none" style={{ color: estSelectionne ? "#D4AF37" : "#9DB8AD" }}>
                          +{visitesJour.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Détail jour sélectionné */}
          {jourSelectionne && visitesJourSelectionne.length > 0 && (
            <div
              className="mt-5 rounded-xl p-4 flex flex-col gap-3"
              style={{ background: "#F0FAF4", border: "1px solid #D1FAE5" }}
            >
              <p className="text-xs font-semibold capitalize" style={{ color: "#0F4C3A" }}>
                {formaterDateLong(jourSelectionne)}
                <span className="ml-2 font-normal" style={{ color: "#9DB8AD" }}>
                  {visitesJourSelectionne.length} visite{visitesJourSelectionne.length > 1 ? "s" : ""}
                </span>
              </p>
              {visitesJourSelectionne.map((v) => (
                <div
                  key={v.id}
                  className="flex gap-3 items-start"
                  style={{ borderTop: "1px solid #C6E8D4", paddingTop: 10 }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                    style={{ background: couleurAgent[v.agent_id ?? ""] ?? "#0F4C3A" }}
                  />
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
                      Client : {v.nom_client}
                      {v.bien_ville && ` · ${v.bien_ville}`}
                    </p>
                    <p className="text-xs" style={{ color: "#9DB8AD" }}>
                      Agent : {v.agent_nom}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Prochains RDV ─────────────────────────────────────────────── */}
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "#0F4C3A" }}>
            Tous les rendez-vous à venir
          </h3>

          {prochaines.length === 0 ? (
            <div
              className="rounded-2xl flex flex-col items-center py-10 text-center px-4"
              style={{ background: "#fff", border: "1px solid #F0EDE5" }}
            >
              <p className="text-xs" style={{ color: "#C4D8CE" }}>Aucun RDV à venir</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {prochaines.map((v) => {
                const couleur = couleurAgent[v.agent_id ?? ""] ?? "#0F4C3A";
                return (
                  <div
                    key={v.id}
                    className="rounded-2xl p-4 flex gap-3"
                    style={{ background: "#fff", border: "1px solid #F0EDE5", borderLeft: `3px solid ${couleur}` }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold mb-0.5" style={{ color: "#9DB8AD" }}>
                        {formaterDateCourte(v.date_confirmee)}
                      </p>
                      <p className="text-sm font-semibold line-clamp-1 leading-snug" style={{ color: "#1f2a24" }}>
                        {v.bien_titre}
                      </p>
                      <p className="text-xs" style={{ color: "#9DB8AD" }}>
                        {v.nom_client}
                        {v.telephone_client && ` · ${v.telephone_client}`}
                      </p>
                      <p className="text-xs font-medium mt-0.5" style={{ color: couleur }}>
                        {v.agent_nom}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
