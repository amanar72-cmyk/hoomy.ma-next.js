// Type partagé pour la table "biens" — noms de colonnes exacts de Supabase
export type Bien = {
  id: string;
  reference: string | null;
  slug: string | null;
  titre: string;
  description: string | null;
  type: string;           // Appartement / Villa / Riad / Bureau / Terrain
  transaction: string;    // "vente" ou "location"
  prix: number;
  ville: string;
  quartier: string | null;
  chambres: number;
  salles_bain: number;
  surface: number;
  latitude: number | null;
  longitude: number | null;
  equipements: string[] | null;
  photos: string[] | null;
  composition: import("@/components/partage/CompositionNiveaux").NiveauBien[] | null;
  caracteristiques: import("@/lib/biens/caracteristiques").Caracteristiques | null;
  verifie: boolean;
  cree_le: string;
};

// Bien tel qu'exposé aux composants client publics : SANS coordonnées exactes.
// Les coordonnées ne circulent que côté serveur (floutage dans lib/geo/floutage.ts).
export type BienPublic = Omit<Bien, "latitude" | "longitude">;

// Colonnes à sélectionner pour tout affichage public — jamais latitude/longitude.
export const COLONNES_BIEN_PUBLIC =
  "id, reference, slug, titre, description, type, transaction, prix, ville, quartier, " +
  "chambres, salles_bain, surface, equipements, photos, composition, caracteristiques, verifie, cree_le";

// Point affiché sur la carte des listes : coordonnées APPROXIMATIVES uniquement
// (floutées côté serveur dans lib/geo/floutage.ts — jamais les exactes).
export type PointCarte = {
  id: string;
  slug: string | null;
  titre: string;
  prix: number;
  transaction: string;
  photo: string | null;
  latApprox: number;
  lngApprox: number;
};

// Valeurs courantes des filtres de recherche
export type FiltresActifs = {
  ville: string;
  quartier: string;
  type: string;
  prixMin: string;
  prixMax: string;
  chambres: string;
  tri: string;
};

// Mapping tri URL → paramètres Supabase
export const TRI_MAP: Record<string, { colonne: string; ascending: boolean }> = {
  cree_le_desc: { colonne: "cree_le", ascending: false },
  cree_le_asc:  { colonne: "cree_le", ascending: true  },
  prix_asc:     { colonne: "prix",    ascending: true  },
  prix_desc:    { colonne: "prix",    ascending: false },
  surface_asc:  { colonne: "surface", ascending: true  },
  surface_desc: { colonne: "surface", ascending: false },
};
