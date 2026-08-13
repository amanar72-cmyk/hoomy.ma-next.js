import "server-only";
import { repliOpenAI } from "./repliOpenAI";

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
 * Statuts pour lesquels on bascule sur OpenAI plutôt que de renvoyer l'échec :
 *   429 → quota dépassé (le cas courant : la clé est sur le palier gratuit)
 *   503 → modèle temporairement surchargé côté Google
 * Les autres statuts (400 charge invalide, 403 clé révoquée…) traduisent un
 * problème qu'un changement de fournisseur ne réglerait pas : on les remonte.
 */
const STATUTS_AVEC_REPLI = new Set([429, 503]);

/**
 * Appelle Gemini, avec deux filets successifs :
 *
 *  1. 404 sur le modèle épinglé (retiré par Google) → nouvel essai sur l'alias
 *     courant. Le symptôme précédent était une panne muette côté utilisateur.
 *  2. 429 / 503 (quota épuisé ou service saturé) → la requête est traduite et
 *     servie par OpenAI, puis réemballée au format Gemini. Indispensable ici :
 *     la clé Gemini est sur le palier gratuit, plafonné à 20 requêtes par JOUR
 *     pour l'ensemble du projet (voir repliOpenAI.ts pour la mesure).
 *
 * Renvoie la Response brute : chaque appelant garde sa propre gestion d'erreur
 * et de format, qui diffère d'un usage à l'autre.
 */
export async function appelerGemini(
  cle: string,
  corps: unknown,
  init?: { signal?: AbortSignal }
): Promise<Response> {
  const corpsFinal = sansReflexion(corps);
  const options: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpsFinal),
    ...(init?.signal ? { signal: init.signal } : {}),
  };

  let reponse = await fetch(url(MODELE_GEMINI, cle), options);

  if (reponse.status === 404) {
    console.error(
      `[gemini] ${MODELE_GEMINI} introuvable (404) — probablement retiré par Google. ` +
        `Repli sur ${MODELE_REPLI}. Pensez à mettre à jour MODELE_GEMINI.`
    );
    reponse = await fetch(url(MODELE_REPLI, cle), options);
  }

  if (STATUTS_AVEC_REPLI.has(reponse.status)) {
    const secours = await repliOpenAI(corpsFinal, init);
    if (secours) return secours;
  }

  return reponse;
}
