// Rate limiter en mémoire — fonctionne sur un seul processus (Hostinger VPS / Vercel single instance).
// Suffit pour bloquer les bots courants sans Redis.

type EntreeLimit = { timestamps: number[] };
const registre = new Map<string, EntreeLimit>();

// Nettoyage automatique pour éviter les fuites mémoire (supprime les clés périmées).
function purger(fenetreMs: number) {
  const maintenant = Date.now();
  for (const [cle, entree] of registre.entries()) {
    entree.timestamps = entree.timestamps.filter((t) => maintenant - t < fenetreMs);
    if (entree.timestamps.length === 0) registre.delete(cle);
  }
}

/**
 * Vérifie le rate limit pour une clé donnée (ex: `${ip}-contact`).
 * Retourne `true` si la requête est autorisée, `false` si la limite est dépassée.
 */
export function verifierRateLimit(
  cle: string,
  maxRequetes: number,
  fenetreMs: number
): boolean {
  const maintenant = Date.now();

  // Purge périodique (1 chance sur 50)
  if (Math.random() < 0.02) purger(fenetreMs);

  const entree = registre.get(cle) ?? { timestamps: [] };
  entree.timestamps = entree.timestamps.filter((t) => maintenant - t < fenetreMs);

  if (entree.timestamps.length >= maxRequetes) return false;

  entree.timestamps.push(maintenant);
  registre.set(cle, entree);
  return true;
}
