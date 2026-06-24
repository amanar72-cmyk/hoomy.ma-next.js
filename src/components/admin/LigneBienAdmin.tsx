"use client";

import { useRouter } from "next/navigation";
import BoutonSupprimer from "./BoutonSupprimer";

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
  verifie, photos, verifierFn, deverifierFn,
}: Props) {
  const router = useRouter();
  const photo = Array.isArray(photos) && photos.length > 0 ? (photos[0] as string) : null;

  return (
    <tr
      onClick={() => router.push(`/admin/biens/${id}`)}
      className="cursor-pointer hover:bg-[#F9F7F4] transition-colors"
      style={{ borderBottom: "1px solid #F0EDE5" }}
    >
      {/* Photo */}
      <td className="px-4 py-3">
        <div className="w-14 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "#F4F6F5" }}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg">🏠</div>
          )}
        </div>
      </td>

      {/* Référence */}
      <td className="px-4 py-3 text-xs" style={{ color: "#9DB8AD" }}>{reference ?? "—"}</td>

      {/* Titre + localisation */}
      <td className="px-4 py-3 text-sm max-w-xs">
        <div className="truncate font-medium" style={{ color: "#3D4A42" }}>{titre}</div>
        <div className="text-xs mt-0.5" style={{ color: "#9DB8AD" }}>
          {quartier ? `${quartier}, ` : ""}{ville}
        </div>
      </td>

      {/* Type */}
      <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: "#6B7A71" }}>{type}</td>

      {/* Prix */}
      <td className="px-4 py-3 text-sm font-medium whitespace-nowrap" style={{ color: "#0F4C3A" }}>
        {formaterPrix(prix, transaction)}
      </td>

      {/* Ville */}
      <td className="px-4 py-3 text-sm" style={{ color: "#6B7A71" }}>{ville}</td>

      {/* Statut */}
      <td className="px-4 py-3">
        <span
          className="text-xs px-2.5 py-0.5 rounded-full font-medium"
          style={verifie
            ? { background: "#D1FAE5", color: "#065F46" }
            : { background: "#FEF3C7", color: "#92400E" }
          }
        >
          {verifie ? "Vérifié" : "En attente"}
        </span>
      </td>

      {/* Actions — stopPropagation pour ne pas déclencher la navigation de la ligne */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 flex-wrap">
          {verifie ? (
            <form action={deverifierFn}>
              <button
                type="submit"
                className="text-xs px-3 py-1 rounded-lg font-medium cursor-pointer"
                style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}
              >
                Dévérifier
              </button>
            </form>
          ) : (
            <form action={verifierFn}>
              <button
                type="submit"
                className="text-xs px-3 py-1 rounded-lg font-medium cursor-pointer"
                style={{ background: "#D1FAE5", color: "#065F46", border: "1px solid #6EE7B7" }}
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
