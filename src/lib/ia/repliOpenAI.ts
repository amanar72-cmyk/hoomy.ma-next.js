import "server-only";

// Repli OpenAI quand Gemini refuse de répondre (quota atteint, service saturé).
//
// POURQUOI CE MODULE EXISTE
// La clé GEMINI_API_KEY du projet est sur le palier GRATUIT. Mesuré en direct
// sur l'API Google :
//   GenerateRequestsPerMinutePerProjectPerModel-FreeTier = 5   (par minute)
//   GenerateRequestsPerDayPerProjectPerModel-FreeTier    = 20  (par JOUR)
// Ces 20 requêtes quotidiennes sont partagées par TOUT le projet : le chatbot
// public de hoomy.ma, le comparateur, les titres SEO et le bouton « Générer
// avec l'IA » du back-office puisent dans le même seau. Quelques visiteurs qui
// discutent avec le chatbot suffisent à épuiser la journée — et l'agent qui
// veut rédiger une annonce reçoit alors « Quota Gemini atteint ».
//
// Le projet dispose déjà d'une clé OpenAI PAYANTE et opérationnelle (elle sert
// aux légendes des publications sociales). On s'en sert comme filet.
//
// CHOIX DE CONCEPTION : la réponse OpenAI est réemballée au FORMAT GEMINI.
// Les quatre appelants gardent ainsi leur code de lecture inchangé — aucun
// n'a besoin de savoir quel fournisseur a répondu.

const MODELE_OPENAI = "gpt-4o";

type PartieGemini = { text?: string };
type ContenuGemini = { role?: string; parts?: PartieGemini[] };

type MessageOpenAI = { role: "system" | "user" | "assistant"; content: string };

/** Concatène les fragments de texte d'un bloc `parts` Gemini. */
function texteDesParties(parts: PartieGemini[] | undefined): string {
  return (parts ?? [])
    .map((p) => p.text ?? "")
    .filter(Boolean)
    .join("\n");
}

/**
 * Traduit une charge utile Gemini en messages OpenAI.
 *
 * Renvoie null si la charge n'est pas exploitable (forme inattendue) : mieux
 * vaut laisser remonter l'erreur Gemini d'origine qu'envoyer une requête
 * tronquée à OpenAI.
 */
function traduireVersOpenAI(corps: unknown): {
  messages: MessageOpenAI[];
  temperature?: number;
  maxTokens?: number;
} | null {
  if (typeof corps !== "object" || corps === null) return null;
  const c = corps as Record<string, unknown>;

  const contents = c.contents;
  if (!Array.isArray(contents) || contents.length === 0) return null;

  const messages: MessageOpenAI[] = [];

  const systeme = c.systemInstruction as { parts?: PartieGemini[] } | undefined;
  const texteSysteme = texteDesParties(systeme?.parts);
  if (texteSysteme) messages.push({ role: "system", content: texteSysteme });

  for (const brut of contents as ContenuGemini[]) {
    const texte = texteDesParties(brut?.parts);
    if (!texte) continue;
    // Gemini nomme « model » ce qu'OpenAI nomme « assistant ».
    messages.push({ role: brut?.role === "model" ? "assistant" : "user", content: texte });
  }

  if (messages.every((m) => m.role === "system")) return null;

  const config = (c.generationConfig ?? {}) as Record<string, unknown>;
  return {
    messages,
    temperature: typeof config.temperature === "number" ? config.temperature : undefined,
    // Gemini 2.5 ponctionnait ce budget pour sa « réflexion » ; gpt-4o ne
    // réfléchit pas en amont, le plafond revient donc entièrement au texte.
    maxTokens: typeof config.maxOutputTokens === "number" ? config.maxOutputTokens : undefined,
  };
}

/** Emballe un texte dans une Response à la forme exacte d'une réponse Gemini. */
function reponseFormatGemini(texte: string, usage: Record<string, unknown>): Response {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { role: "model", parts: [{ text: texte }] }, finishReason: "STOP" }],
      usageMetadata: usage,
      // Marqueur de traçabilité : permet de savoir, dans les logs ou en
      // débogage, qu'une réponse ne vient pas de Gemini.
      hoomyFournisseur: "openai",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

/**
 * Tente de servir la requête via OpenAI.
 *
 * Renvoie null si le repli est impossible (pas de clé, charge intraduisible,
 * appel en échec) — l'appelant conserve alors la réponse Gemini d'origine et
 * son message d'erreur habituel.
 */
export async function repliOpenAI(
  corps: unknown,
  init?: { signal?: AbortSignal }
): Promise<Response | null> {
  const cle = process.env.OPENAI_API_KEY;
  if (!cle) {
    console.error("[ia] Gemini indisponible et OPENAI_API_KEY absente — aucun repli possible.");
    return null;
  }

  const traduit = traduireVersOpenAI(corps);
  if (!traduit) {
    console.error("[ia] Charge utile Gemini intraduisible — repli OpenAI abandonné.");
    return null;
  }

  try {
    const reponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cle}` },
      body: JSON.stringify({
        model: MODELE_OPENAI,
        messages: traduit.messages,
        ...(traduit.temperature !== undefined ? { temperature: traduit.temperature } : {}),
        ...(traduit.maxTokens !== undefined ? { max_tokens: traduit.maxTokens } : {}),
      }),
      ...(init?.signal ? { signal: init.signal } : {}),
    });

    if (!reponse.ok) {
      console.error(`[ia] Repli OpenAI en échec : HTTP ${reponse.status} ${(await reponse.text()).slice(0, 200)}`);
      return null;
    }

    const data = await reponse.json();
    const texte: unknown = data?.choices?.[0]?.message?.content;
    if (typeof texte !== "string" || !texte.trim()) {
      console.error("[ia] Repli OpenAI : réponse vide.");
      return null;
    }

    console.warn(`[ia] Quota Gemini épuisé → réponse servie par ${MODELE_OPENAI}.`);
    return reponseFormatGemini(texte, {
      promptTokenCount: data?.usage?.prompt_tokens ?? 0,
      candidatesTokenCount: data?.usage?.completion_tokens ?? 0,
      totalTokenCount: data?.usage?.total_tokens ?? 0,
    });
  } catch (e) {
    console.error("[ia] Repli OpenAI — exception :", e instanceof Error ? e.message : String(e));
    return null;
  }
}
