// Lien vers la fiche PUBLIQUE d'un bien, depuis le back-office.
//
// POURQUOI CE MODULE EXISTE
// Le back-office est servi depuis pro.hoomy.ma, le site public depuis
// hoomy.ma. Un lien écrit en chemin relatif (`/acheter/mon-slug`) reste donc
// sur pro.hoomy.ma, où le middleware ne le reconnaît ni comme /admin ni comme
// /pro : il tombe dans la branche « chemin inconnu », interroge le rôle et
// redirige vers l'accueil du bon espace. Résultat côté utilisateur : on clique
// sur « Voir l'annonce » et on atterrit sur l'accueil admin.
//
// La correction est de toujours produire une URL ABSOLUE vers le domaine
// public. Ce module est l'unique endroit où cette URL se construit — six
// endroits du back-office la fabriquaient chacun à sa façon.

/** Domaine public du site. Le back-office vit sur `pro.` du même domaine. */
export const SITE_PUBLIC = "https://hoomy.ma";

type BienLiable = {
  slug: string | null;
  id: string;
  transaction: string | null;
};

/**
 * Statuts pour lesquels la fiche publique existe réellement.
 *
 * Les autres biens sont filtrés par la RLS côté clé anonyme : la page publique
 * répond alors « Bien non trouvé ». Proposer un lien actif enverrait l'agent
 * dans une impasse — d'où `peutEtreVisualise` ci-dessous, qui permet
 * d'afficher le bouton désactivé plutôt que de le faire disparaître.
 */
const STATUTS_EN_LIGNE = new Set(["finalise", "transacte"]);

export function peutEtreVisualise(statut: string | null | undefined): boolean {
  return STATUTS_EN_LIGNE.has(statut ?? "");
}

/**
 * URL absolue de la fiche publique.
 *
 * Le slug est privilégié ; l'identifiant sert de repli car la page publique
 * accepte les deux (voir fetchBien dans acheter/[slug] et louer/[slug]).
 */
export function urlPubliqueBien(bien: BienLiable): string {
  const segment = bien.transaction === "location" ? "louer" : "acheter";
  return `${SITE_PUBLIC}/${segment}/${bien.slug ?? bien.id}`;
}
