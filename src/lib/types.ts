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
  verifie: boolean;
  cree_le: string;
};

// Valeurs courantes des filtres de recherche
export type FiltresActifs = {
  ville: string;
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
