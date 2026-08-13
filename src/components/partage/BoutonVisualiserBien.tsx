import { infoStatut } from "@/lib/biens/statuts";

// Bouton « Visualiser le bien » des fiches back-office (admin et agent).
//
// Deux points qui ne sont pas cosmétiques :
//
// 1. C'est un <a> et non un <Link> Next. La cible est un AUTRE domaine
//    (hoomy.ma alors que le back-office est sur pro.hoomy.ma) : la navigation
//    client de Next n'a rien à y faire.
//
// 2. Il s'ouvre dans un nouvel onglet. L'agent consulte l'annonce publiée sans
//    perdre la fiche qu'il est en train de modifier — c'est d'ailleurs ce que
//    promettait déjà l'icône « lien externe » du bouton d'origine.
//
// Quand le bien n'est pas encore en ligne, le bouton reste VISIBLE mais
// désactivé, avec le motif au survol. Le faire disparaître laissait croire à
// une fonctionnalité manquante, alors que la fiche publique n'existe
// simplement pas encore.

type Props = {
  href: string;
  actif: boolean;
  statut: string | null;
  /** `true` sur les listes, où le bouton doit rester discret. */
  compact?: boolean;
};

function IcLienExterne({ taille }: { taille: number }) {
  return (
    <svg width={taille} height={taille} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export default function BoutonVisualiserBien({ href, actif, statut, compact = false }: Props) {
  const classes = compact
    ? "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-opacity"
    : "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl transition-opacity";
  const taille = compact ? 10 : 11;

  if (!actif) {
    return (
      <span
        className={`${classes} cursor-not-allowed`}
        style={{ background: "#F4F6F5", color: "#9DB8AD", border: "1px solid #E0DAC8" }}
        title={`Ce bien n'est pas encore en ligne (${infoStatut(statut).label}) — la fiche publique n'existe pas.`}
      >
        <IcLienExterne taille={taille} />
        Visualiser le bien
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${classes} hover:opacity-90`}
      style={{ background: "#D4AF37", color: "#0F4C3A", textDecoration: "none" }}
      title="Ouvrir la fiche publique sur hoomy.ma dans un nouvel onglet"
    >
      <IcLienExterne taille={taille} />
      Visualiser le bien
    </a>
  );
}
