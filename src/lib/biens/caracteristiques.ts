// Caractéristiques spécifiques par type de bien — stockées dans la colonne
// jsonb biens.caracteristiques. Source de vérité UNIQUE : les formulaires
// (agent, admin, wizard) et l'affichage lisent cette config, pour ne jamais
// diverger.
//
// Conçu comme un « expert immobilier » : chaque type expose les champs qui lui
// sont pertinents. Les champs communs (état, année, titre juridique, meublé)
// sont ajoutés à tous sauf le terrain.

export type TypeChamp = "nombre" | "texte" | "bool" | "select" | "date";

export type ChampCarac = {
  cle: string;
  label: string;
  type: TypeChamp;
  options?: string[];   // pour type "select"
  suffixe?: string;     // ex. "m²", "m"
  obligatoire?: boolean; // champ requis à la saisie (validation formulaire)
};

/** Valeur d'un champ caractéristique. */
export type ValeurCarac = string | number | boolean;
export type Caracteristiques = Record<string, ValeurCarac>;

// Champs communs (bâti) — ajoutés à tous les types sauf Terrain.
const COMMUNS: ChampCarac[] = [
  { cle: "surface_totale", label: "Surface totale", type: "nombre", suffixe: "m²" },
  { cle: "etat", label: "État du bien", type: "select", options: ["Neuf", "Récemment rénové", "Bon état", "À rénover"] },
  { cle: "annee_construction", label: "Année de construction", type: "nombre" },
  { cle: "date_livraison", label: "Date de livraison", type: "date" },
  { cle: "disponibilite", label: "Disponibilité", type: "select", options: ["Libre", "Occupé", "Loué"] },
  { cle: "titre_juridique", label: "Titre juridique", type: "select", options: ["Titre foncier", "Réquisition", "Melkia", "En cours"] },
  { cle: "numero_titre_foncier", label: "Numéro du titre foncier", type: "texte" },
  { cle: "meuble", label: "Meublé", type: "select", options: ["Non", "Partiellement", "Oui"], obligatoire: true },
  { cle: "visite_3d", label: "Visite 3D (lien)", type: "texte" },
];

const APPARTEMENT: ChampCarac[] = [
  { cle: "etage", label: "Étage du bien", type: "nombre" },
  { cle: "detail_etage", label: "Détail de l'étage", type: "select", options: ["Rez-de-chaussée", "Sous-sol", "Étage intermédiaire", "Dernier étage", "Duplex"] },
  { cle: "nb_etages_immeuble", label: "Nombre d'étages de l'immeuble", type: "nombre" },
  { cle: "ascenseur", label: "Ascenseur", type: "bool" },
  { cle: "balcon_terrasse", label: "Balcon / terrasse", type: "nombre", suffixe: "m²" },
  { cle: "parking", label: "Places de parking", type: "nombre" },
  { cle: "cave", label: "Cave / débarras", type: "bool" },
];

const MAISON_VILLA: ChampCarac[] = [
  { cle: "surface_terrain", label: "Surface du terrain", type: "nombre", suffixe: "m²" },
  { cle: "nb_niveaux", label: "Nombre de niveaux", type: "nombre" },
  { cle: "jardin", label: "Jardin", type: "nombre", suffixe: "m²" },
  { cle: "piscine", label: "Piscine", type: "bool" },
  { cle: "garage", label: "Garage (voitures)", type: "nombre" },
];

const RIAD: ChampCarac[] = [
  { cle: "nb_suites", label: "Chambres / suites", type: "nombre" },
  { cle: "patios", label: "Patios", type: "nombre" },
  { cle: "terrasse", label: "Terrasse", type: "nombre", suffixe: "m²" },
  { cle: "puits_lumiere", label: "Puits de lumière", type: "bool" },
];

const BUREAU: ChampCarac[] = [
  { cle: "etage", label: "Étage", type: "nombre" },
  { cle: "nb_pieces", label: "Nombre de pièces", type: "nombre" },
  { cle: "open_space", label: "Open space", type: "bool" },
  { cle: "parking", label: "Places de parking", type: "nombre" },
  { cle: "acces_pmr", label: "Accès PMR", type: "bool" },
];

const LOCAL_COMMERCIAL: ChampCarac[] = [
  { cle: "niveau", label: "Niveau (RDC, 1er…)", type: "texte" },
  { cle: "vitrine_ml", label: "Vitrine / façade", type: "nombre", suffixe: "m linéaires" },
  { cle: "hauteur_plafond", label: "Hauteur sous plafond", type: "nombre", suffixe: "m" },
  { cle: "activite_autorisee", label: "Activité autorisée", type: "texte" },
  { cle: "parking", label: "Places de parking", type: "nombre" },
];

// Terrain : pas de « bâti », donc pas de COMMUNS ; ses propres champs.
const TERRAIN: ChampCarac[] = [
  { cle: "surface_terrain", label: "Surface du terrain", type: "nombre", suffixe: "m²" },
  { cle: "titre_juridique", label: "Titre juridique", type: "select", options: ["Titre foncier", "Réquisition", "Melkia", "En cours"] },
  { cle: "numero_titre_foncier", label: "Numéro du titre foncier", type: "texte" },
  { cle: "zonage", label: "Zonage / vocation", type: "select", options: ["Résidentiel", "Commercial", "Industriel", "Agricole", "Mixte"] },
  { cle: "constructible", label: "Constructible", type: "bool" },
  { cle: "viabilise_eau", label: "Viabilisé — eau", type: "bool" },
  { cle: "viabilise_elec", label: "Viabilisé — électricité", type: "bool" },
  { cle: "cloture", label: "Clôturé", type: "bool" },
  { cle: "disponibilite", label: "Disponibilité", type: "select", options: ["Libre", "Occupé"] },
  { cle: "visite_3d", label: "Visite 3D (lien)", type: "texte" },
];

/** Champs à afficher pour un type de bien donné (spécifiques + communs). */
export function champsPourType(type: string): ChampCarac[] {
  switch (type) {
    case "Appartement":       return [...APPARTEMENT, ...COMMUNS];
    case "Maison":            return [...MAISON_VILLA, ...COMMUNS];
    case "Villa":             return [...MAISON_VILLA, ...COMMUNS];
    case "Riad":              return [...RIAD, ...COMMUNS];
    case "Bureau":            return [...BUREAU, ...COMMUNS];
    case "Local commercial":  return [...LOCAL_COMMERCIAL, ...COMMUNS];
    case "Terrain":           return TERRAIN;
    default:                  return COMMUNS;
  }
}

/** Champs effectivement RENSEIGNÉS pour ce type (valeur non vide / non false). */
export function champsRenseignes(
  type: string,
  valeurs: Caracteristiques | null | undefined
): ChampCarac[] {
  const carac = valeurs ?? {};
  return champsPourType(type).filter((c) => {
    const v = carac[c.cle];
    return v !== undefined && v !== null && v !== "" && v !== false;
  });
}

/** Champs OBLIGATOIRES non renseignés pour ce type (validation formulaire). */
export function caracObligatoiresManquantes(
  type: string,
  valeurs: Caracteristiques | null | undefined
): ChampCarac[] {
  const carac = valeurs ?? {};
  return champsPourType(type).filter((c) => {
    if (!c.obligatoire) return false;
    const v = carac[c.cle];
    return v === undefined || v === null || v === "" || v === false;
  });
}

/** Ne garde que les caractéristiques pertinentes pour le type (nettoyage au save). */
export function filtrerCaracteristiques(type: string, valeurs: Caracteristiques): Caracteristiques {
  const cles = new Set(champsPourType(type).map((c) => c.cle));
  const sortie: Caracteristiques = {};
  for (const [k, v] of Object.entries(valeurs)) {
    if (!cles.has(k)) continue;
    // On ignore les valeurs vides (chaîne vide, NaN) pour ne pas polluer le jsonb.
    if (v === "" || (typeof v === "number" && Number.isNaN(v))) continue;
    sortie[k] = v;
  }
  return sortie;
}
