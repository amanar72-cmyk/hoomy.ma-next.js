import "server-only";

// Génération du TITRE d'une annonce via Gemini — court, attractif, optimisé SEO.
// Best-effort : renvoie null en cas d'échec (clé absente, timeout, réponse
// illisible) pour que l'appelant conserve le titre saisi et n'échoue jamais.

type InfosBien = {
  type: string;
  transaction: string;
  ville: string;
  quartier?: string | null;
  prix?: number | null;
  surface?: number | null;
  chambres?: number | null;
  /** Titre saisi par l'humain — sert d'indice, l'IA a le dernier mot. */
  titreActuel?: string | null;
};

const SYSTEM = `Tu génères le TITRE d'une annonce immobilière pour HOOMY.MA (plateforme premium au Maroc).
Objectif : un titre court, attractif et OPTIMISÉ SEO (indexable sur Google), en français.
Règles STRICTES :
- 50 à 70 caractères idéalement, UNE seule ligne, sans guillemets, sans emoji, sans point final.
- Inclure le type de bien + la ville (et le quartier si fourni) + un atout concret (surface ou chambres).
- Ton vendeur mais honnête : aucun superlatif mensonger, aucune caractéristique non fournie.
- Pas de MAJUSCULES criardes.
Réponds UNIQUEMENT avec le titre, rien d'autre.`;

export async function genererTitreSEO(bien: InfosBien): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prixFormate = bien.prix
    ? `${Number(bien.prix).toLocaleString("fr-FR")} DH${bien.transaction === "location" ? "/mois" : ""}`
    : null;

  const lignes = [
    `Type : ${bien.type}`,
    `Transaction : ${bien.transaction === "location" ? "À louer" : "À vendre"}`,
    `Ville : ${bien.ville}${bien.quartier ? `, ${bien.quartier}` : ""}`,
    bien.surface ? `Surface : ${bien.surface} m²` : null,
    bien.chambres && bien.chambres > 0 ? `Chambres : ${bien.chambres}` : null,
    prixFormate ? `Prix : ${prixFormate}` : null,
    bien.titreActuel ? `Titre proposé (à améliorer, simple indice) : ${bien.titreActuel}` : null,
  ].filter(Boolean).join("\n");

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: lignes }] }],
          systemInstruction: { parts: [{ text: SYSTEM }] },
          generationConfig: { temperature: 0.6, maxOutputTokens: 80, topP: 0.9 },
        }),
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const texte = data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
    if (!texte) return null;

    // Une seule ligne, sans guillemets/point final parasites.
    const titre = texte
      .trim()
      .split("\n")[0]
      .replace(/^["'«»\s]+|["'«».\s]+$/g, "")
      .trim();

    return titre.length >= 8 ? titre.slice(0, 150) : null;
  } catch {
    return null;
  }
}
