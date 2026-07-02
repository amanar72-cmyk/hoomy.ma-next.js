// ─── Barème indicatif des frais d'acquisition immobilière au Maroc ─────────────
// Taux indicatifs — modifiez ici pour mettre à jour tous les affichages du site.

import { formaterMontant } from "@/lib/format";

const DROITS_ENREGISTREMENT = 0.04;       // 4 % du prix
const CONSERVATION_FONCIERE_TAUX = 0.015; // 1,5 % du prix
const CONSERVATION_FONCIERE_MIN = 1_000;  // plancher indicatif en DH
const TVA_HONORAIRES = 0.10;              // TVA 10 % sur les honoraires
const FRAIS_DIVERS = 1_500;               // forfait timbres, copies d'actes

// Barème dégressif des honoraires notaire (indicatif HT)
const NOTAIRE_TRANCHES = [
  { jusquA: 500_000, taux: 0.010 },
  { jusquA: 1_000_000, taux: 0.008 },
  { jusquA: 5_000_000, taux: 0.005 },
  { jusquA: Infinity, taux: 0.003 },
] as const;

function honorairesHT(prix: number): number {
  let total = 0;
  let restant = prix;
  let borne = 0;
  for (const { jusquA, taux } of NOTAIRE_TRANCHES) {
    if (restant <= 0) break;
    const tranche = jusquA === Infinity ? restant : Math.min(restant, jusquA - borne);
    total += tranche * taux;
    restant -= tranche;
    borne = jusquA === Infinity ? borne : jusquA;
  }
  return total;
}

export interface ResultatFrais {
  droits: number;
  conservation: number;
  honorairesHT: number;
  tvaHonoraires: number;
  honorairesTTC: number;
  fraisDivers: number;
  totalFrais: number;
  coutTotal: number;
  tauxFrais: number; // ratio totalFrais / prix
}

export function calculerFraisAcquisition(prix: number): ResultatFrais {
  const droits = prix * DROITS_ENREGISTREMENT;
  const conservation = Math.max(prix * CONSERVATION_FONCIERE_TAUX, CONSERVATION_FONCIERE_MIN);
  const ht = honorairesHT(prix);
  const tvaHonoraires = ht * TVA_HONORAIRES;
  const honorairesTTC = ht + tvaHonoraires;
  const fraisDivers = FRAIS_DIVERS;
  const totalFrais = droits + conservation + honorairesTTC + fraisDivers;
  return {
    droits, conservation, honorairesHT: ht, tvaHonoraires,
    honorairesTTC, fraisDivers, totalFrais,
    coutTotal: prix + totalFrais,
    tauxFrais: totalFrais / prix,
  };
}

export function formaterDH(n: number): string {
  return formaterMontant(Math.round(n)) + " DH";
}
