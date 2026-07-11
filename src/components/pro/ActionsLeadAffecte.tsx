"use client";

// Actions de l'agent sur un lead qualifié qui lui est AFFECTÉ :
// Appeler / WhatsApp en un tap + avancement du statut
// (Affecté → Contacté → Qualifié → Converti / Perdu).

import { useTransition } from "react";
import { formatPhoneMaroc } from "@/lib/utils/telephone";
import { afficherToast } from "@/components/ui/Toaster";
import { changerStatutLeadQualifieAgent } from "@/app/pro/actions";

const STATUTS = [
  { valeur: "transmis", libelle: "Affecté" },
  { valeur: "contacte", libelle: "Contacté" },
  { valeur: "qualifie", libelle: "Qualifié" },
  { valeur: "converti", libelle: "Converti ✓" },
  { valeur: "perdu", libelle: "Perdu" },
] as const;

type Props = {
  leadId: string;
  nom: string;
  telephone: string;
  statut: string;
};

export default function ActionsLeadAffecte({ leadId, nom, telephone, statut }: Props) {
  const [enCours, demarrer] = useTransition();
  const tel = formatPhoneMaroc(telephone);
  const messageWA = encodeURIComponent(
    `Bonjour ${nom}, HOOMY.MA — je suis votre conseiller dédié. Quand pouvons-nous échanger sur votre projet ?`
  );

  function changerStatut(nouveau: string) {
    if (nouveau === statut) return;
    demarrer(async () => {
      try {
        await changerStatutLeadQualifieAgent(leadId, nouveau);
        afficherToast(`Statut : ${STATUTS.find((s) => s.valeur === nouveau)?.libelle ?? nouveau}`);
      } catch (e) {
        afficherToast(e instanceof Error ? e.message : "Erreur lors du changement de statut");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2" style={{ opacity: enCours ? 0.6 : 1, transition: "opacity 0.15s" }}>
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
      {tel.numeroWA && (
        <a
          href={`https://wa.me/${tel.numeroWA}?text=${messageWA}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl"
          style={{ background: "#25D366", color: "#fff", textDecoration: "none" }}
        >
          WhatsApp
        </a>
      )}
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
    </div>
  );
}
