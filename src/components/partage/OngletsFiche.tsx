// Navigation par onglets d'une fiche bien back-office — sans JavaScript client :
// chaque onglet est un lien qui recharge la page avec ?onglet=… (Server Component).

import Link from "next/link";

export type OngletFiche = {
  id: string;
  label: string;
  badge?: string | number;
};

type Props = {
  onglets: OngletFiche[];
  actif: string;
  /** Chemin de la fiche, ex. /pro/biens/xxx — l'onglet est ajouté en query */
  hrefBase: string;
};

export default function OngletsFiche({ onglets, actif, hrefBase }: Props) {
  return (
    <nav
      className="flex gap-1 mb-6 overflow-x-auto"
      style={{ borderBottom: "1px solid #E8E4DA" }}
      aria-label="Sections de la fiche"
    >
      {onglets.map((o) => {
        const estActif = o.id === actif;
        return (
          <Link
            key={o.id}
            href={o.id === onglets[0].id ? hrefBase : `${hrefBase}?onglet=${o.id}`}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm whitespace-nowrap transition-colors"
            style={{
              color: estActif ? "#0F4C3A" : "#9DB8AD",
              fontWeight: estActif ? 600 : 500,
              borderBottom: estActif ? "2px solid #D4AF37" : "2px solid transparent",
              marginBottom: -1,
              textDecoration: "none",
            }}
          >
            {o.label}
            {o.badge !== undefined && (
              <span
                className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                style={
                  estActif
                    ? { background: "#0F4C3A", color: "#fff" }
                    : { background: "#F0EDE5", color: "#9DB8AD" }
                }
              >
                {o.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
