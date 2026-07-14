import "server-only";

// CERVEAU de l'agent commercial IA — fonction PARTAGÉE entre le simulateur
// admin (/api/agent/simulateur) et le webhook WhatsApp (/api/whatsapp/webhook).
//
// 3 étapes :
//   A. Classification + extraction (OpenAI gpt-4o, JSON strict garanti par
//      response_format json_object + parsing défensif en secours)
//   B. Recherche RÉELLE dans la table biens (statut 'finalise' = publié)
//   C. Rédaction commerciale — uniquement à partir des biens réels, dans la
//      langue détectée (fr / darija / en).
//
// LECTURE SEULE : aucun lead créé, rien d'écrit en base, aucun envoi.
// La clé OPENAI_API_KEY reste côté serveur (import "server-only").

import OpenAI from "openai";
import { supabase as supabasePublic } from "@/lib/supabase";

const MODELE = "gpt-4o";
const TIMEOUT_MS = 30_000;

// ── Types ─────────────────────────────────────────────────────────────────────

export type CriteresAgent = {
  ville: string | null;
  quartier: string | null;
  type: string | null;
  budget_max: number | null;
  chambres: number | null;
};

export type ClassificationAgent = {
  intention: "acheteur" | "vendeur" | "autre";
  langue: "fr" | "ar" | "en";
  criteres: CriteresAgent;
};

export type BienAgent = {
  reference: string | null;
  titre: string;
  type: string;
  transaction: string;
  ville: string;
  quartier: string | null;
  prix: number;
  chambres: number;
  surface: number;
  lien: string;
};

export type ReponseAgent = ClassificationAgent & {
  biens: BienAgent[];
  reponse: string;
};

// ── Étape A : classification ──────────────────────────────────────────────────

// Valeurs canoniques du schéma réel de la table biens
const VILLES = ["Casablanca", "Marrakech", "Rabat", "Tanger", "Agadir", "Fès"];
const TYPES_BIEN = ["Appartement", "Villa", "Riad", "Bureau", "Terrain"];

// response_format json_object garantit un objet JSON syntaxiquement valide ;
// la STRUCTURE exacte est décrite ici (exigence OpenAI : le mot « JSON » doit
// figurer dans les messages), et revalidée par le parsing défensif.
const PROMPT_CLASSIFICATION = `Tu es le module de classification de HOOMY.MA, plateforme immobilière marocaine.
On te donne un message client (WhatsApp). Tu renvoies UNIQUEMENT un objet JSON, sans texte autour.

Structure JSON exacte attendue :
{"intention": "acheteur"|"vendeur"|"autre", "langue": "fr"|"ar"|"en", "criteres": {"ville": string|null, "quartier": string|null, "type": string|null, "budget_max": number|null, "chambres": number|null}}

Règles :
- intention "acheteur" = veut acheter OU louer un bien. "vendeur" = veut vendre/mettre en location SON bien. "autre" = tout le reste (salutation, question générale...).
- langue : "ar" couvre l'arabe ET la darija même écrite en lettres latines (ex. "bghit nchri dar"). Sinon "fr" ou "en".
- criteres : uniquement pertinents pour un acheteur ; pour vendeur/autre, mets tout à null.
- ville : une de ${VILLES.join(", ")} (orthographe exacte) ou null si non mentionnée/hors liste.
- type : un de ${TYPES_BIEN.join(", ")} (orthographe exacte) ou null. "partement"/"appart" → Appartement.
- budget_max : en dirhams. Convertis : "1M"/"1 million" → 1000000, "800k" → 800000. null si absent.
- chambres : nombre MINIMUM de chambres demandé (entier), null si absent.
- Toutes les clés sont obligatoires, y compris les null.`;

/** Parse défensif : retire d'éventuelles balises \`\`\`json et valide les enums. */
function parserClassification(brut: string): ClassificationAgent | null {
  try {
    const nettoye = brut
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    const obj = JSON.parse(nettoye) as Record<string, unknown>;

    const intention = ["acheteur", "vendeur", "autre"].includes(obj.intention as string)
      ? (obj.intention as ClassificationAgent["intention"])
      : "autre";
    const langue = ["fr", "ar", "en"].includes(obj.langue as string)
      ? (obj.langue as ClassificationAgent["langue"])
      : "fr";
    const c = (obj.criteres ?? {}) as Record<string, unknown>;

    return {
      intention,
      langue,
      criteres: {
        ville: typeof c.ville === "string" && c.ville ? c.ville : null,
        quartier: typeof c.quartier === "string" && c.quartier ? c.quartier : null,
        type: typeof c.type === "string" && c.type ? c.type : null,
        budget_max: typeof c.budget_max === "number" && c.budget_max > 0 ? c.budget_max : null,
        chambres: typeof c.chambres === "number" && c.chambres > 0 ? Math.floor(c.chambres) : null,
      },
    };
  } catch {
    return null;
  }
}

// ── Étape B : recherche réelle dans biens ─────────────────────────────────────

async function chercherBiens(criteres: CriteresAgent): Promise<BienAgent[]> {
  // Colonnes réelles du schéma : statut 'finalise' = bien publié sur le site
  let q = supabasePublic
    .from("biens")
    .select("reference, slug, titre, type, transaction, prix, ville, quartier, chambres, surface")
    .eq("statut", "finalise")
    .order("cree_le", { ascending: false })
    .limit(5);

  if (criteres.ville) q = q.ilike("ville", criteres.ville);
  if (criteres.type) q = q.ilike("type", criteres.type);
  if (criteres.quartier) q = q.ilike("quartier", `%${criteres.quartier}%`);
  if (criteres.budget_max) q = q.lte("prix", criteres.budget_max);
  if (criteres.chambres) q = q.gte("chambres", criteres.chambres);

  const { data, error } = await q;
  if (error) throw new Error(`Recherche biens échouée : ${error.message}`);

  return ((data ?? []) as {
    reference: string | null; slug: string | null; titre: string; type: string;
    transaction: string; prix: number; ville: string; quartier: string | null;
    chambres: number; surface: number;
  }[]).map((b) => ({
    reference: b.reference,
    titre: b.titre,
    type: b.type,
    transaction: b.transaction,
    ville: b.ville,
    quartier: b.quartier,
    prix: b.prix,
    chambres: b.chambres,
    surface: b.surface,
    lien: `https://hoomy.ma/${b.transaction === "location" ? "louer" : "acheter"}/${b.slug ?? ""}`,
  }));
}

// ── Étape C : prompts de rédaction ────────────────────────────────────────────

const LANGUES: Record<string, string> = {
  fr: "français",
  ar: "darija marocaine (écris en arabe, sauf si le client a écrit la darija en lettres latines — réponds alors pareil)",
  en: "anglais",
};

function promptRedaction(classification: ClassificationAgent): string {
  const base = `Tu es le conseiller commercial de HOOMY.MA, plateforme immobilière premium au Maroc.
Tu réponds à un message client comme sur WhatsApp : ton chaleureux, humain, professionnel, adapté au marché marocain. Court et naturel (pas de listes à rallonge). Termine par une signature légère « — HOOMY ».
Réponds STRICTEMENT en ${LANGUES[classification.langue]}.`;

  if (classification.intention === "acheteur") {
    return `${base}

RÈGLE ABSOLUE : tu ne peux proposer QUE les biens de la liste JSON fournie dans le message (source de vérité). N'invente JAMAIS un bien, un prix, une surface ou une caractéristique. N'arrondis pas les prix.
- Si la liste contient des biens : propose-en 2 ou 3 maximum (titre, quartier/ville, prix en DH, référence), donne le lien, et oriente vers une VISITE (propose d'organiser une visite ou un appel).
- Si la liste est VIDE : dis-le honnêtement, propose d'élargir les critères (budget, quartier, type) et/ou d'être recontacté par un conseiller dès qu'un bien correspond.`;
  }

  if (classification.intention === "vendeur") {
    return `${base}

Le client veut vendre ou mettre en location son bien.
- Qualifie gentiment : pose 1 à 2 questions si des informations manquent (type de bien, ville/quartier, surface).
- Oriente vers le dépôt gratuit du bien sur hoomy.ma/publier OU propose le rappel d'un conseiller dédié.
- INTERDICTION ABSOLUE d'avancer un prix, une fourchette ou une estimation chiffrée, même approximative. Si le client demande un prix, explique qu'un conseiller doit d'abord voir le bien.`;
  }

  return `${base}

L'intention du client n'est pas claire. Accueille-le chaleureusement, reformule brièvement ce que tu as compris de son message, et demande-lui s'il souhaite ACHETER/LOUER un bien ou VENDRE le sien.`;
}

// ── Fonction principale ───────────────────────────────────────────────────────

/**
 * Cerveau de l'agent : message client → intention, langue, critères, biens
 * réels, réponse commerciale. Lance une Error explicite si OPENAI_API_KEY
 * est absente, si le modèle renvoie un JSON illisible, ou en cas d'échec API
 * (les erreurs typées OpenAI remontent telles quelles à l'appelant).
 */
export async function genererReponseAgent(message: string): Promise<ReponseAgent> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY manquante. Ajoutez-la dans .env.local (et Hostinger) puis redémarrez.");
  }

  const texte = message.trim().slice(0, 2000);
  if (!texte) throw new Error("Message vide.");

  const openai = new OpenAI({ apiKey, timeout: TIMEOUT_MS, maxRetries: 1 });

  // ── A. Classification + extraction (JSON strict via response_format) ───────
  const repA = await openai.chat.completions.create({
    model: MODELE,
    max_tokens: 500,
    temperature: 0, // classification : déterminisme maximal
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: PROMPT_CLASSIFICATION },
      { role: "user", content: texte },
    ],
  });

  const texteA = repA.choices[0]?.message?.content ?? "";
  const classification = parserClassification(texteA);
  if (!classification) {
    throw new Error("Classification illisible (JSON invalide renvoyé par le modèle).");
  }

  // ── B. Recherche réelle (acheteur uniquement) ───────────────────────────────
  const biens = classification.intention === "acheteur"
    ? await chercherBiens(classification.criteres)
    : [];

  // ── C. Rédaction commerciale ────────────────────────────────────────────────
  const contenuC = classification.intention === "acheteur"
    ? `Message du client :\n${texte}\n\nBiens disponibles (SOURCE DE VÉRITÉ — liste exhaustive) :\n${JSON.stringify(biens, null, 2)}`
    : `Message du client :\n${texte}`;

  const repC = await openai.chat.completions.create({
    model: MODELE,
    max_tokens: 800,
    temperature: 0.7, // rédaction : un peu de naturel
    messages: [
      { role: "system", content: promptRedaction(classification) },
      { role: "user", content: contenuC },
    ],
  });

  const reponse = repC.choices[0]?.message?.content ?? "";

  return { ...classification, biens, reponse };
}
