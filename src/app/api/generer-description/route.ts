import { NextResponse } from "next/server";

// ─── Prompt système ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es un rédacteur immobilier pour HOOMY.MA, plateforme premium au Maroc.
À partir des caractéristiques fournies, rédige une description attractive, professionnelle et vendeuse, en mettant en valeur les atouts RÉELS du bien.
N'invente JAMAIS de caractéristique non fournie. Si une info est absente, ne la mentionne pas.
Ton chaleureux et premium, ~3-4 phrases en français.
Réponds UNIQUEMENT avec un objet JSON valide, sans Markdown ni texte autour.
Format attendu : {"description_fr":"..."}`.trim();

// ─── Types ────────────────────────────────────────────────────────────────────

type Payload = {
  type: string;
  transaction: string;
  ville: string;
  quartier: string;
  prix: string;
  surface: string;
  chambres: string;
  salles_bain: string;
  equipements: string[];
};

// ─── Extraction robuste du JSON depuis la réponse Gemini ──────────────────────
// Gemini peut entourer le JSON de ``` ou ajouter du texte avant/après

function extraireJSON(texte: string): string {
  const bloc = texte.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (bloc) return bloc[1].trim();
  const debut = texte.indexOf("{");
  const fin = texte.lastIndexOf("}");
  if (debut !== -1 && fin !== -1) return texte.slice(debut, fin + 1);
  return texte.trim();
}

// ─── Route POST ───────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json() as Payload;
    const { type, transaction, ville, quartier, prix, surface, chambres, salles_bain, equipements } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[generer-description] GEMINI_API_KEY manquante");
      return NextResponse.json({ erreur: "Service IA non configuré." }, { status: 500 });
    }

    // ── Construction du prompt utilisateur ──
    const prixFormate = prix
      ? `${Number(prix).toLocaleString("fr-FR")} DH${transaction === "location" ? "/mois" : ""}`
      : null;

    const lignes = [
      `Type : ${type}`,
      `Transaction : ${transaction === "vente" ? "À vendre" : "À louer"}`,
      `Ville : ${ville}${quartier ? `, ${quartier}` : ""}`,
      prixFormate ? `Prix : ${prixFormate}` : null,
      surface ? `Surface : ${surface} m²` : null,
      chambres && Number(chambres) > 0 ? `Chambres : ${chambres}` : null,
      salles_bain && Number(salles_bain) > 0 ? `Salles de bain : ${salles_bain}` : null,
      equipements?.length > 0 ? `Équipements : ${equipements.join(", ")}` : null,
    ].filter(Boolean).join("\n");

    const payload = {
      contents: [{ role: "user", parts: [{ text: lignes }] }],
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 800,
        topP: 0.9,
      },
    };

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const geminiData = await geminiRes.json();

    if (!geminiRes.ok) {
      const statut = geminiData?.error?.status;
      const message =
        statut === "RESOURCE_EXHAUSTED"
          ? "Quota Gemini atteint — réessayez dans quelques instants."
          : `Erreur IA : ${geminiData?.error?.message ?? "inconnue"}`;
      console.error("[generer-description] Erreur Gemini :", geminiData?.error);
      return NextResponse.json({ erreur: message }, { status: 503 });
    }

    const texte: string | undefined =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!texte) {
      console.error("[generer-description] Réponse vide :", JSON.stringify(geminiData));
      return NextResponse.json({ erreur: "L'IA n'a pas renvoyé de contenu." }, { status: 500 });
    }

    // ── Parsing robuste ──
    let resultat: { description_fr?: string };
    try {
      resultat = JSON.parse(extraireJSON(texte));
    } catch {
      console.error("[generer-description] JSON invalide :", texte);
      return NextResponse.json(
        { erreur: "L'IA a renvoyé une réponse mal formée. Réessayez." },
        { status: 500 }
      );
    }

    if (!resultat.description_fr) {
      return NextResponse.json(
        { erreur: "L'IA n'a pas fourni de description. Réessayez." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      description_fr: resultat.description_fr.trim(),
    });
  } catch (err) {
    console.error("[generer-description] Erreur inattendue :", err);
    return NextResponse.json(
      { erreur: "Une erreur technique est survenue. Réessayez." },
      { status: 500 }
    );
  }
}
