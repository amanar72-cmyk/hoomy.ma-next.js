// Carte « ligne riche » d'un bien pour les listes back-office (pro et admin).
// Server Component : la carte entière est cliquable via un lien étiré
// (position absolue) ; les actions passées en slot restent cliquables au-dessus
// (z-index supérieur) — pas de <button> imbriqué dans un <Link>.

import Link from "next/link";
import { formaterPrix } from "@/lib/format";
import { infoStatut } from "@/lib/biens/statuts";
import { TYPES_DOCUMENTS_FICHE } from "@/lib/documents/fiche";

export type BienListe = {
  id: string;
  reference: string | null;
  titre: string;
  type: string;
  transaction: string;
  prix: number;
  ville: string;
  quartier: string | null;
  surface: number;
  chambres: number;
  statut: string | null;
  verifie: boolean;
  cree_le: string;
  date_soumission: string | null;
  // Absente tant que date_publication.sql n'a pas été exécuté — affichée « — »
  date_publication?: string | null;
  nombre_vues?: number | null;
};

type Props = {
  bien: BienListe;
  /** Fiche détail à ouvrir (ex. /pro/biens/xxx ou /admin/biens/xxx) */
  href: string;
  photo: string | null;
  nbDemandesVisite: number;
  /** Nombre de documents requis déposés (sur 3) */
  nbDocs: number;
  /** Nom du conseiller affecté — affiché côté admin uniquement */
  agentNom?: string | null;
  /** Boutons d'action (colonne de droite) */
  actions?: React.ReactNode;
};

function formaterDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CarteBienListe({
  bien, href, photo, nbDemandesVisite, nbDocs, agentNom, actions,
}: Props) {
  const statut = infoStatut(bien.statut);
  const vues = bien.nombre_vues ?? 0;
  const docsComplets = nbDocs >= TYPES_DOCUMENTS_FICHE.length;

  return (
    <article
      className="relative rounded-2xl p-3 sm:p-4 flex gap-3 sm:gap-4 transition-shadow hover:shadow-md"
      style={{
        background: "#fff",
        border: "1px solid #F0EDE5",
        boxShadow: "0 1px 8px rgba(15,76,58,0.05)",
      }}
    >
      {/* Lien étiré : toute la carte ouvre la fiche */}
      <Link
        href={href}
        aria-label={`Ouvrir la fiche « ${bien.titre} »`}
        className="absolute inset-0 z-[1] rounded-2xl"
        style={{ textDecoration: "none" }}
      />

      {/* Photo miniature */}
      <div
        className="flex-shrink-0 rounded-xl overflow-hidden"
        style={{ width: 112, height: 88, background: "#F4F6F5" }}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={bien.titre} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="#C4D8CE" strokeWidth="1.2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
        )}
      </div>

      {/* Informations */}
      <div className="flex-1 min-w-0">
        {/* Ligne 1 : titre + référence + badges */}
        <div className="flex items-start gap-2 flex-wrap mb-0.5">
          <p className="text-sm font-semibold leading-snug line-clamp-1" style={{ color: "#1f2a24" }}>
            {bien.titre}
          </p>
          {bien.reference && (
            <span
              className="text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: "#F0EDE5", color: "#9DB8AD" }}
            >
              {bien.reference}
            </span>
          )}
          <span
            className="text-xs font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0"
            style={{ background: statut.bg, color: statut.color }}
          >
            {statut.label}
          </span>
          {bien.verifie && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: "#D1FAE5", color: "#065F46" }}
            >
              ✓ Vérifié
            </span>
          )}
        </div>

        {/* Ligne 2 : type · quartier · ville (+ conseiller côté admin) */}
        <p className="text-xs" style={{ color: "#9DB8AD" }}>
          {bien.type}
          {bien.quartier ? ` · ${bien.quartier}` : ""}
          {" · "}{bien.ville}
          {agentNom !== undefined && (
            <span style={{ color: agentNom ? "#6B7A71" : "#C4D8CE" }}>
              {" · "}Conseiller : {agentNom ?? "non affecté"}
            </span>
          )}
        </p>

        {/* Ligne 3 : prix + caractéristiques */}
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-sm font-bold" style={{ color: "#0F4C3A" }}>
            {formaterPrix(bien.prix, bien.transaction)}
          </span>
          <span className="text-xs" style={{ color: "#6B7A71" }}>
            {bien.surface > 0 ? `${bien.surface} m²` : ""}
            {bien.chambres > 0 ? ` · ${bien.chambres} ch.` : ""}
          </span>
        </div>

        {/* Ligne 4 : dates, vues, demandes, dossier documentaire */}
        <div className="flex items-center gap-x-3 gap-y-1 mt-1.5 flex-wrap text-xs" style={{ color: "#9DB8AD" }}>
          <span>Soumis le {formaterDate(bien.date_soumission ?? bien.cree_le)}</span>
          <span>Publié le {formaterDate(bien.date_publication)}</span>
          <span className="inline-flex items-center gap-1">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {vues} vue{vues !== 1 ? "s" : ""}
          </span>
          <span>
            {nbDemandesVisite} demande{nbDemandesVisite !== 1 ? "s" : ""} de visite
          </span>
          <span
            className="font-semibold px-2 py-0.5 rounded-full"
            style={docsComplets
              ? { background: "#D1FAE5", color: "#065F46" }
              : { background: "#FEF3C7", color: "#92400E" }
            }
          >
            Docs {nbDocs}/{TYPES_DOCUMENTS_FICHE.length}
          </span>
        </div>
      </div>

      {/* Actions — au-dessus du lien étiré */}
      {actions && (
        <div className="relative z-[2] flex flex-col items-end justify-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </article>
  );
}
