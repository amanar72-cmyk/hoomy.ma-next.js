/**
 * Normalise un numéro de téléphone marocain en format international sans +.
 * Ex: "0612345678" → "212612345678"
 *     "+212612345678" → "212612345678"
 *     "0612 34 56 78" → "212612345678"
 *
 * CRITIQUE : cette fonction doit être IDENTIQUE côté inscription et connexion.
 * Toute divergence empêche l'utilisateur de se reconnecter.
 */
export function normaliserTelephone(tel: string): string {
  // Supprime tout sauf les chiffres
  let chiffres = tel.replace(/\D/g, "");

  // Cas "+212XXXXXXXXX" → "212XXXXXXXXX" (déjà sans +)
  // ou "212XXXXXXXXX" direct
  if (chiffres.startsWith("212") && chiffres.length === 12) {
    return chiffres;
  }

  // Cas "0XXXXXXXXX" → "212XXXXXXXXX"
  if (chiffres.startsWith("0") && chiffres.length === 10) {
    return "212" + chiffres.slice(1);
  }

  // Retourne tel-quel si déjà sans préfixe (9 chiffres marocains)
  if (chiffres.length === 9) {
    return "212" + chiffres;
  }

  // Fallback : utilise les chiffres bruts
  return chiffres;
}

/**
 * Génère l'email technique Supabase Auth depuis un numéro normalisé.
 * L'utilisateur ne voit jamais cet email.
 */
export function emailTechniqueDepuisTelephone(tel: string): string {
  const normalise = normaliserTelephone(tel);
  return `${normalise}@phone.hoomy.ma`;
}
