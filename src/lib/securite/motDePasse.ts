// Règles de robustesse des mots de passe, partagées par la création de compte
// client (FormulaireInscription) et la définition de mot de passe après
// invitation (FormulaireDefinirMotDePasse).
//
// ⚠️ Cette validation est côté CLIENT : elle guide l'utilisateur, elle ne
// protège pas. La clé anon étant publique, n'importe qui peut appeler
// supabase.auth.signUp() directement sans passer par ce formulaire. Le seul
// contrôle qui fait foi est celui de Supabase :
//   Authentication → Policies → Password Requirements (+ longueur minimale).
// Les deux doivent rester alignés.

export const LONGUEUR_MIN = 10;

export type Critere = { libelle: string; valide: boolean };

// Classes Unicode (\p{..}/u) plutôt que [A-Z] : « É » est une majuscule et
// « ç » une minuscule — l'ASCII seul pénaliserait les mots de passe français.
export function evaluerMotDePasse(mdp: string): Critere[] {
  return [
    { libelle: `${LONGUEUR_MIN} caractères minimum`, valide: mdp.length >= LONGUEUR_MIN },
    { libelle: "une majuscule",                      valide: /\p{Lu}/u.test(mdp) },
    { libelle: "une minuscule",                      valide: /\p{Ll}/u.test(mdp) },
    { libelle: "un chiffre",                         valide: /\p{Nd}/u.test(mdp) },
    { libelle: "un caractère spécial (! ? @ # …)",   valide: /[^\p{L}\p{N}]/u.test(mdp) },
  ];
}

/** Renvoie un message d'erreur en français, ou null si le mot de passe convient. */
export function validerMotDePasse(mdp: string): string | null {
  const manquants = evaluerMotDePasse(mdp).filter((c) => !c.valide);
  if (manquants.length === 0) return null;
  return `Mot de passe trop faible — il manque : ${manquants.map((c) => c.libelle).join(", ")}.`;
}
