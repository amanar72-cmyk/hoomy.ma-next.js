"use client";

import { useRouter } from "next/navigation";
import BoutonSupprimer from "./BoutonSupprimer";

const BADGE_STATUT: Record<string, { label: string; bg: string; color: string }> = {
  brouillon:     { label: "Brouillon",     bg: "#F5F5F5", color: "#777" },
  affecte:       { label: "Affecté",       bg: "#FEF3C7", color: "#92400E" },
  en_validation: { label: "En validation", bg: "#DBEAFE", color: "#1E40AF" },
  finalise:      { label: "Publié",        bg: "#D1FAE5", color: "#065F46" },
  transacte:     { label: "Transacté",     bg: "#F3E8FF", color: "#6B21A8" },
};

type Props = {
  id: string;
  reference: string | null;
  titre: string;
  type: string;
  transaction: string;
  prix: number;
  ville: string;
  quartier: string | null;
  verifie: boolean;
  statut: string | null;
  agentNom: string | null;
  photos: unknown[] | null;
  verifierFn: () => Promise<void>;
  deverifierFn: () => Promise<void>;
};

function formaterPrix(prix: number, transaction: string) {
  const montant = prix.toLocaleString("fr-MA");
  return transaction === "location" ? `${montant} DH/mois` : `${montant} DH`;
}

export default function LigneBienAdmin({
  id, reference, titre, type, transaction, prix, ville, quartier,
  verifie, statut, agentNom, photos, verifierFn, deverifierFn,
}: Props) {
  const router = useRouter();
  const photo = Array.isArray(photos) && photos.length > 0 ? (photos[0] as string) : null;
  const badge = BADGE_STATUT[statut ?? ""] ?? { label: statut ?? "—", bg: "#F5F5F5", color: "#777" };

  return (
    <tr
      onClick={() => router.push(`/admin/biens/${id}`)}
      className="cursor-pointer hover:bg-[#FAFAFA] transition-colors"
      style={{ borderBottom: "1px solid #F5F5F5" }}
    >
      {/* Photo */}
      <td className="px-4 py-3">
        <div className="w-12 h-9 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "#F5F5F5" }}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-base">🏠</div>
          )}
        </div>
      </td>

      {/* Référence */}
      <td className="px-4 py-3 text-xs font-mono" style={{ color: "#BBB" }}>
        {reference ?? "—"}
      </td>

      {/* Titre + localisation */}
      <td className="px-4 py-3 text-sm max-w-xs">
        <div className="truncate font-medium" style={{ color: "#111" }}>{titre}</div>
        <div className="text-xs mt-0.5" style={{ color: "#999" }}>
          {type}{quartier ? ` · ${quartier}` : ""}{` · ${ville}`}
        </div>
      </td>

      {/* Statut */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <span
            className="text-xs px-2.5 py-0.5 rounded-full font-medium w-fit"
            style={{ background: badge.bg, color: badge.color }}
          >
            {badge.label}
          </span>
          {verifie && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium w-fit"
              style={{ background: "#D1FAE5", color: "#065F46" }}>
              ✓ Vérifié
            </span>
          )}
        </div>
      </td>

      {/* Prix */}
      <td className="px-4 py-3 text-sm font-semibold whitespace-nowrap" style={{ color: "#111" }}>
        {formaterPrix(prix, transaction)}
      </td>

      {/* Agent affecté */}
      <td className="px-4 py-3 text-sm" style={{ color: agentNom ? "#333" : "#CCC" }}>
        {agentNom ?? "—"}
      </td>

      {/* Actions — stopPropagation pour ne pas déclencher la navigation */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {verifie ? (
            <form action={deverifierFn}>
              <button
                type="submit"
                className="text-xs px-2.5 py-1 rounded-lg font-medium cursor-pointer"
                style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}
              >
                Dévérifier
              </button>
            </form>
          ) : (
            <form action={verifierFn}>
              <button
                type="submit"
                className="text-xs px-2.5 py-1 rounded-lg font-medium cursor-pointer"
                style={{ background: "#F0F0F0", color: "#444", border: "1px solid #E0E0E0" }}
              >
                Vérifier
              </button>
            </form>
          )}
          <BoutonSupprimer id={id} titre={titre} />
        </div>
      </td>
    </tr>
  );
}
