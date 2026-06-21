import { createClient } from "@/lib/supabase/client";

// ─── Types exportés ──────────────────────────────────────────────────────────

export type DonneesEstimation = {
  ville: string;
  quartier: string;
  typeBien: string;
  transaction: "vente" | "location";
  surface: number;
  etat: "neuf" | "bon_etat" | "a_renover";
  etage: "rdc" | "intermediaire" | "dernier" | "";
  equipements: string[];
};

export type ResultatEstimation = {
  basse: number;
  moyenne: number;
  haute: number;
  prixM2Min: number;
  prixM2Moyen: number;
  prixM2Max: number;
  zone: string;
};

// ─── Tables de multiplicateurs ───────────────────────────────────────────────

const MULT_ETAT: Record<string, number> = {
  neuf: 1.1,
  bon_etat: 1.0,
  a_renover: 0.85,
};

const MULT_ETAGE: Record<string, number> = {
  rdc: 0.95,
  intermediaire: 1.0,
  dernier: 1.05,
};

// Bonus additifs (s'accumulent sur le multiplicateur de base)
const BONUS_EQUIPEMENTS: Record<string, number> = {
  piscine: 0.05,
  vue: 0.03,
  ascenseur: 0.02,
  parking: 0.02,
  terrasse: 0.02,
  jardin: 0.02,
};

// ─── Calcul du multiplicateur global ─────────────────────────────────────────
// Fonction pure — facilement remplaçable par un modèle IA plus tard.

export function calculerMultiplicateur(
  donnees: Pick<DonneesEstimation, "etat" | "etage" | "equipements">
): number {
  let mult = MULT_ETAT[donnees.etat] ?? 1.0;
  if (donnees.etage) mult *= MULT_ETAGE[donnees.etage] ?? 1.0;
  for (const eq of donnees.equipements) {
    mult += BONUS_EQUIPEMENTS[eq] ?? 0.02;
  }
  return mult;
}

// ─── Recherche dans grille_prix + calcul final ────────────────────────────────

export async function calculerEstimation(
  donnees: DonneesEstimation
): Promise<ResultatEstimation | null> {
  const supabase = createClient();

  // 1. Cherche une ligne précise : ville + quartier exact + type_bien + transaction
  let { data } = await supabase
    .from("grille_prix")
    .select("prix_m2_min, prix_m2_moyen, prix_m2_max, quartier")
    .eq("ville", donnees.ville)
    .eq("type_bien", donnees.typeBien)
    .eq("transaction", donnees.transaction)
    .eq("quartier", donnees.quartier)
    .maybeSingle();

  // 2. Fallback : ligne générale pour la ville (quartier = null)
  if (!data && donnees.quartier) {
    const res = await supabase
      .from("grille_prix")
      .select("prix_m2_min, prix_m2_moyen, prix_m2_max, quartier")
      .eq("ville", donnees.ville)
      .eq("type_bien", donnees.typeBien)
      .eq("transaction", donnees.transaction)
      .is("quartier", null)
      .maybeSingle();
    data = res.data;
  }

  if (!data) return null;

  const mult = calculerMultiplicateur(donnees);
  const { surface } = donnees;

  return {
    basse: Math.round(surface * data.prix_m2_min * mult),
    moyenne: Math.round(surface * data.prix_m2_moyen * mult),
    haute: Math.round(surface * data.prix_m2_max * mult),
    prixM2Min: Math.round(data.prix_m2_min * mult),
    prixM2Moyen: Math.round(data.prix_m2_moyen * mult),
    prixM2Max: Math.round(data.prix_m2_max * mult),
    zone: data.quartier ?? donnees.ville,
  };
}
