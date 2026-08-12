import "server-only";

// Point d'entrée UNIQUE vers l'API Gemini.
//
// POURQUOI CE MODULE EXISTE
// Le nom du modèle était recopié dans quatre fichiers. Quand Google a retiré
// `gemini-1.5-flash`, l'API a répondu 404 et TROIS fonctionnalités sont
// tombées d'un coup, silencieusement : la génération de descriptif au
// back-office, le comparateur de biens et la génération de titres SEO. Seul
// le chatbot, déjà passé en 2.5, continuait de fonctionner.
//
// Le nom du modèle vit désormais ici : une future mise hors service se corrige
// en une ligne, et non en quatre fichiers à retrouver.

/**
 * Modèle par défaut : version STABLE et généralement disponible.
 * Un modèle épinglé finit toujours par être retiré — d'où le repli ci-dessous.
 */
export const MODELE_GEMINI = "gemini-2.5-flash";

/**
 * Alias « toujours à jour » de Google. Sert UNIQUEMENT de filet quand le
 * modèle épinglé disparaît : plutôt qu'un 404 qui casse la fonctionnalité,
 * on bascule automatiquement sur la version courante.
 */
const MODELE_REPLI = "gemini-flash-latest";

function url(modele: string, cle: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent?key=${encodeURIComponent(cle)}`;
}

/**
 * Désactive la « réflexion » du modèle, sauf si l'appelant l'a explicitement
 * configurée.
 *
 * PIÈGE À CONNAÎTRE : contrairement à Gemini 1.5, les modèles 2.5 consomment
 * des jetons de réflexion SUR LE BUDGET DE SORTIE (maxOutputTokens). Mesuré
 * sur la génération de titre SEO, plafonnée à 80 jetons : 74 partaient en
 * réflexion, 2 restaient pour le texte, et le titre sortait tronqué à
 * « Appart » avec finishReason MAX_TOKENS. Aucune erreur, juste un résultat
 * inutilisable.
 *
 * Nos usages sont tous des rédactions courtes et cadrées : la réflexion
 * n'apporte rien et consomme le budget. thinkingBudget: 0 rend au texte
 * l'intégralité des jetons.
 */
function sansReflexion(corps: unknown): unknown {
  if (typeof corps !== "object" || corps === null) return corps;
  const c = corps as Record<string, unknown>;
  const config = (c.generationConfig ?? {}) as Record<string, unknown>;
  if ("thinkingConfig" in config) return corps; // choix explicite de l'appelant
  return { ...c, generationConfig: { ...config, thinkingConfig: { thinkingBudget: 0 } } };
}

/**
 * Appelle Gemini. En cas de 404 sur le modèle épinglé (modèle retiré par
 * Google), retente une fois avec l'alias courant et le signale dans les logs
 * — le symptôme précédent était une panne muette côté utilisateur.
 *
 * Renvoie la Response brute : chaque appelant garde sa propre gestion
 * d'erreur et de format, qui diffère d'un usage à l'autre.
 */
export async function appelerGemini(
  cle: string,
  corps: unknown,
  init?: { signal?: AbortSignal }
): Promise<Response> {
  const options: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sansReflexion(corps)),
    ...(init?.signal ? { signal: init.signal } : {}),
  };

  const reponse = await fetch(url(MODELE_GEMINI, cle), options);
  if (reponse.status !== 404) return reponse;

  console.error(
    `[gemini] ${MODELE_GEMINI} introuvable (404) — probablement retiré par Google. ` +
      `Repli sur ${MODELE_REPLI}. Pensez à mettre à jour MODELE_GEMINI.`
  );
  return fetch(url(MODELE_REPLI, cle), options);
}
