// ═══ SOURCE DE VÉRITÉ UNIQUE : villes où HOOMY diffuse publiquement ═══
//
// Pour OUVRIR une nouvelle ville : l'ajouter à VILLES_ACTIVES ci-dessous —
// c'est la SEULE ligne à modifier. Tout le site en dérive : sélecteurs du
// moteur de recherche public, requêtes /acheter et /louer, mise en avant de
// l'accueil, agent commercial IA, chat public, carte des prix, méta SEO.
//
// NE limite PAS : le formulaire « publier un bien » (on capte les vendeurs
// partout), le back-office pro/admin (voit tout), ni l'accès aux fiches par
// lien direct (les biens des autres villes restent en ligne, juste absents
// des résultats de recherche).

export const VILLES_ACTIVES = ["Agadir", "Casablanca", "Fès", "Marrakech", "Rabat", "Tanger"] as const;

/** Normalisation : minuscules + accents retirés (données réelles hétérogènes). */
function normaliser(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

/** true si la ville fait partie des villes actives — insensible casse/accents. */
export function estVilleActive(ville: string): boolean {
  const cible = normaliser(ville);
  return VILLES_ACTIVES.some((v) => normaliser(v) === cible);
}

/**
 * Clause .or() PostgREST restreignant une requête biens aux villes actives.
 * `ilike` sans joker = égalité insensible à la casse (tolère « agadir »,
 * « MARRAKECH »… présents dans les données réelles).
 * Usage : query = query.or(FILTRE_VILLES_ACTIVES_OR)
 */
export const FILTRE_VILLES_ACTIVES_OR = VILLES_ACTIVES.map(
  (v) => `ville.ilike.${v}`
).join(",");

/** Liste mutable (les API Supabase attendent string[], pas readonly). */
export const LISTE_VILLES_ACTIVES: string[] = [...VILLES_ACTIVES];

/** Libellé « Agadir et Marrakech » pour les textes/méta SEO. */
export const LIBELLE_VILLES_ACTIVES =
  VILLES_ACTIVES.length > 1
    ? `${VILLES_ACTIVES.slice(0, -1).join(", ")} et ${VILLES_ACTIVES[VILLES_ACTIVES.length - 1]}`
    : VILLES_ACTIVES[0];
