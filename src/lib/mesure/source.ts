// Classement de la provenance d'une visite pour la mesure d'audience interne.
// Partagé entre le composant client (détection) et la route API (validation).
// Aucune donnée personnelle : seulement une catégorie.

export const SOURCES_AUDIENCE = [
  "meta",      // Facebook / Instagram (pubs ou publications)
  "google",    // Google (recherche ou annonces)
  "whatsapp",
  "moteur",    // autres moteurs de recherche
  "ia",        // assistants IA (ChatGPT, Perplexity…)
  "direct",    // adresse tapée, favori, appli sans référent
  "autre",
] as const;

export type SourceAudience = (typeof SOURCES_AUDIENCE)[number];

export const LIBELLE_SOURCE: Record<SourceAudience, string> = {
  meta: "Facebook / Instagram",
  google: "Google",
  whatsapp: "WhatsApp",
  moteur: "Autres moteurs",
  ia: "Assistants IA",
  direct: "Direct",
  autre: "Autres sites",
};

function depuisTexte(texte: string): SourceAudience | null {
  const t = texte.toLowerCase();
  if (/facebook|instagram|^fb$|^ig$|meta|fb\.me|l\.facebook|lm\.facebook/.test(t)) return "meta";
  if (/whatsapp|wa\.me/.test(t)) return "whatsapp";
  if (/google/.test(t)) return "google";
  if (/bing|yahoo|duckduckgo|ecosia|qwant|yandex|baidu/.test(t)) return "moteur";
  if (/chatgpt|openai|perplexity|claude|gemini|copilot/.test(t)) return "ia";
  return null;
}

/**
 * Détermine la source d'une arrivée sur le site.
 * Ordre : paramètres utm, puis identifiants de clic (fbclid, gclid), puis référent.
 */
export function detecterSource(url: URL, referent: string): SourceAudience {
  const utm = url.searchParams.get("utm_source");
  if (utm) return depuisTexte(utm) ?? "autre";

  if (url.searchParams.has("fbclid")) return "meta";
  if (url.searchParams.has("gclid") || url.searchParams.has("gbraid") || url.searchParams.has("wbraid")) {
    return "google";
  }

  if (!referent) return "direct";

  let hote: string;
  try {
    hote = new URL(referent).hostname;
  } catch {
    return "autre";
  }
  // Référent = le site lui-même (retour arrière, rechargement) : pas une source externe.
  if (hote === url.hostname) return "direct";

  return depuisTexte(hote) ?? "autre";
}
