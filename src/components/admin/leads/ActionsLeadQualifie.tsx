"use client";

// Actions de traitement d'un lead qualifié — pensé mobile d'abord :
// Appeler / WhatsApp en un tap, statut, affectation à un conseiller
// (sélecteur enrichi calqué sur le module affectations : recherche,
// zones en tête, charge croissante), notes internes.

import { useMemo, useState, useTransition } from "react";
import { formatPhoneMaroc } from "@/lib/utils/telephone";
import { lienWhatsAppLead } from "@/lib/leads/messageWhatsApp";
import { afficherToast } from "@/components/ui/Toaster";
import {
  changerStatutLeadQualifie,
  affecterLeadConseiller,
  enregistrerNotesLead,
} from "@/app/admin/leads/actions";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConseillerLead = {
  id: string;
  nom_complet: string | null;
  zones: string[] | null;
  nbLeadsActifs: number;
};

type Props = {
  leadId: string;
  nom: string;
  telephone: string;
  statut: string;
  agentId: string | null;
  agentNom: string | null;
  notesInterne: string | null;
  zonesLead: string[];
  conseillers: ConseillerLead[];
  /** Ce que le prospect a écrit — repris dans le message WhatsApp. */
  message?: string | null;
  /** Rappel programmé, mentionné dans le message WhatsApp s'il existe. */
  dateRappel?: string | null;
  /** Origine du lead — adapte la 1re phrase du message WhatsApp. */
  source?: string | null;
  /** Titre du bien concerné, si le lead vient d'une fiche. */
  titreBien?: string | null;
};

const STATUTS = [
  { valeur: "nouveau",  libelle: "Nouveau" },
  { valeur: "contacte", libelle: "Contacté" },
  { valeur: "qualifie", libelle: "Qualifié" },
  { valeur: "transmis", libelle: "Transmis" },
  { valeur: "converti", libelle: "Converti ✓" },
  { valeur: "perdu",    libelle: "Perdu" },
] as const;

// ── Composant ─────────────────────────────────────────────────────────────────

export default function ActionsLeadQualifie({
  leadId, nom, telephone, statut, agentId, agentNom, notesInterne, zonesLead, conseillers,
  message, dateRappel, source, titreBien,
}: Props) {
  const [enCours, demarrer] = useTransition();
  const [modalConseiller, setModalConseiller] = useState(false);
  const [notesOuvertes, setNotesOuvertes] = useState(false);
  const [notes, setNotes] = useState(notesInterne ?? "");

  const tel = formatPhoneMaroc(telephone);

  function changerStatut(nouveau: string) {
    if (nouveau === statut) return;
    demarrer(async () => {
      try {
        await changerStatutLeadQualifie(leadId, nouveau);
        afficherToast(`Statut : ${STATUTS.find((s) => s.valeur === nouveau)?.libelle ?? nouveau}`);
      } catch (e) {
        afficherToast(e instanceof Error ? e.message : "Erreur lors du changement de statut");
      }
    });
  }

  function affecter(conseillersId: string) {
    setModalConseiller(false);
    demarrer(async () => {
      try {
        await affecterLeadConseiller(leadId, conseillersId);
        afficherToast("Lead affecté au conseiller");
      } catch (e) {
        afficherToast(e instanceof Error ? e.message : "Erreur lors de l'affectation");
      }
    });
  }

  function sauverNotes() {
    demarrer(async () => {
      try {
        await enregistrerNotesLead(leadId, notes);
        afficherToast("Notes enregistrées");
        setNotesOuvertes(false);
      } catch (e) {
        afficherToast(e instanceof Error ? e.message : "Erreur lors de l'enregistrement");
      }
    });
  }

  return (
    <div style={{ opacity: enCours ? 0.6 : 1, transition: "opacity 0.15s" }}>
      {/* ── Rangée d'actions ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Appeler */}
        {tel.lienTel && (
          <a
            href={`tel:${tel.lienTel}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl"
            style={{ background: "#0F4C3A", color: "#fff", textDecoration: "none" }}
          >
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            Appeler
          </a>
        )}

        {/* WhatsApp */}
        {tel.numeroWA && (
          <a
            href={lienWhatsAppLead(tel.numeroWA, { nom, message, dateRappel, source, titreBien })}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl"
            style={{ background: "#25D366", color: "#fff", textDecoration: "none" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </a>
        )}

        {/* Statut */}
        <select
          value={statut}
          onChange={(e) => changerStatut(e.target.value)}
          disabled={enCours}
          aria-label="Statut du lead"
          className="text-xs font-medium px-2.5 py-2 rounded-xl border cursor-pointer focus:outline-none"
          style={{ borderColor: "#E0DAC8", color: "#0F4C3A", background: "#fff" }}
        >
          {STATUTS.map((s) => (
            <option key={s.valeur} value={s.valeur}>{s.libelle}</option>
          ))}
        </select>

        {/* Affecter */}
        <button
          type="button"
          onClick={() => setModalConseiller(true)}
          disabled={enCours}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border cursor-pointer"
          style={
            agentId
              ? { borderColor: "#D4AF37", color: "#A07C1E", background: "rgba(212,175,55,0.08)" }
              : { borderColor: "#0F4C3A", color: "#0F4C3A", background: "transparent" }
          }
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          {agentNom ? `→ ${agentNom}` : "Affecter"}
        </button>

        {/* Notes */}
        <button
          type="button"
          onClick={() => setNotesOuvertes((o) => !o)}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl cursor-pointer"
          style={{ background: "#F0EDE5", color: "#6B7A71" }}
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Notes{notesInterne ? " ●" : ""}
        </button>
      </div>

      {/* ── Notes internes (repliables) ──────────────────────────────────── */}
      {notesOuvertes && (
        <div className="mt-3">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Notes internes (visibles uniquement par l'équipe)…"
            className="w-full border rounded-xl px-3 py-2.5 text-sm"
            style={{ borderColor: "#E0DAC8", color: "#1f2a24", resize: "vertical", background: "#FFFDF8" }}
          />
          <div className="flex justify-end gap-2 mt-1.5">
            <button
              type="button"
              onClick={() => { setNotes(notesInterne ?? ""); setNotesOuvertes(false); }}
              className="text-xs px-3 py-1.5 rounded-lg cursor-pointer"
              style={{ color: "#9DB8AD" }}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={sauverNotes}
              disabled={enCours}
              className="text-xs font-semibold px-4 py-1.5 rounded-lg cursor-pointer"
              style={{ background: "#0F4C3A", color: "#fff" }}
            >
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* ── Modal choix conseiller ───────────────────────────────────────── */}
      {modalConseiller && (
        <ModalChoixConseiller
          conseillers={conseillers}
          zonesLead={zonesLead}
          onChoisir={affecter}
          onFermer={() => setModalConseiller(false)}
        />
      )}
    </div>
  );
}

// ── Modal sélection conseiller (pattern du module affectations) ──────────────

function ModalChoixConseiller({ conseillers, zonesLead, onChoisir, onFermer }: {
  conseillers: ConseillerLead[];
  zonesLead: string[];
  onChoisir: (agentId: string) => void;
  onFermer: () => void;
}) {
  const [recherche, setRecherche] = useState("");

  const zonesRef = useMemo(() => zonesLead.map((z) => z.toLowerCase()), [zonesLead]);

  function matchZone(c: ConseillerLead): boolean {
    const zones = (c.zones ?? []).map((z) => z.toLowerCase());
    return zonesRef.some((zl) => zones.some((z) => z.includes(zl) || zl.includes(z)));
  }

  const tries = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    const filtres = conseillers.filter(
      (c) =>
        !q ||
        c.nom_complet?.toLowerCase().includes(q) ||
        (c.zones ?? []).some((z) => z.toLowerCase().includes(q))
    );
    return [...filtres].sort((a, b) => {
      const az = matchZone(a);
      const bz = matchZone(b);
      if (az !== bz) return az ? -1 : 1;
      return a.nbLeadsActifs - b.nbLeadsActifs;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conseillers, recherche, zonesRef]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
      style={{ background: "rgba(15,76,58,0.35)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onFermer(); }}
    >
      <div className="rounded-2xl w-full max-w-md overflow-hidden"
        style={{ background: "#fff", boxShadow: "0 16px 64px rgba(15,76,58,0.18)" }}>

        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #F0EDE5" }}>
          <div>
            <h3 className="font-semibold text-base" style={{ color: "#0F4C3A" }}>Affecter à un conseiller</h3>
            <p className="text-xs mt-0.5" style={{ color: "#9DB8AD" }}>
              {zonesLead.length > 0 ? `Zones ${zonesLead.join(", ")} en tête · ` : ""}par charge croissante
            </p>
          </div>
          <button type="button" onClick={onFermer}
            className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer hover:opacity-70"
            style={{ background: "#F4F6F5", color: "#6B7A71" }}>✕</button>
        </div>

        <div className="px-4 py-3" style={{ borderBottom: "1px solid #F0EDE5" }}>
          <input type="text" value={recherche} onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un conseiller ou une zone…" autoFocus
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none"
            style={{ borderColor: "#E0DAC8", color: "#0F4C3A" }} />
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 380 }}>
          {tries.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color: "#9DB8AD" }}>Aucun conseiller trouvé</p>
          ) : tries.map((c) => {
            const initiales = (c.nom_complet ?? "?")
              .split(/\s+/).map((m) => m[0]).slice(0, 2).join("").toUpperCase();
            return (
              <button key={c.id} type="button" onClick={() => onChoisir(c.id)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
                style={{ borderBottom: "1px solid #F8F5EE" }}>
                <span
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: "#0F4C3A", color: "#D4AF37" }}
                >
                  {initiales}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium" style={{ color: "#1f2a24" }}>{c.nom_complet ?? "—"}</p>
                    {matchZone(c) && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ background: "#D1FAE5", color: "#064E3B" }}>✓ zone</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {(c.zones ?? []).length > 0 && (
                      <p className="text-xs truncate" style={{ color: "#9DB8AD", maxWidth: 160 }}>
                        {(c.zones ?? []).join(", ")}
                      </p>
                    )}
                    <span className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{
                        background: c.nbLeadsActifs > 5 ? "#FEF3C7" : "#F0EDE5",
                        color: c.nbLeadsActifs > 5 ? "#92400E" : "#6B7A71",
                      }}>
                      {c.nbLeadsActifs} lead{c.nbLeadsActifs !== 1 ? "s" : ""} actif{c.nbLeadsActifs !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#0F4C3A" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
