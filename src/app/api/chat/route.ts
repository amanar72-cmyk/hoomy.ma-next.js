import { NextResponse } from "next/server";

// ─── System prompt (réponses dans la langue du visiteur) ──────────────────────

const SYSTEM_PROMPT = `
Tu es l'assistant virtuel de HOOMY.MA, plateforme immobilière marocaine premium (achat, vente, location de biens au Maroc).

RÈGLES STRICTES :
- Tu réponds UNIQUEMENT aux questions liées à l'immobilier au Maroc : achat, vente, location, estimation, quartiers, prix, surfaces, démarches administratives, crédit immobilier, conseils acheteur/vendeur, fonctionnement de HOOMY.
- Si la question n'a AUCUN rapport avec l'immobilier (cuisine, code informatique, politique, sport, devoirs scolaires, santé, etc.), refuse poliment et recentre sur l'immobilier, dans la langue du visiteur. Exemple FR : "Je suis l'assistant immobilier de HOOMY, je peux uniquement vous aider sur vos projets immobiliers au Maroc."
- DÉTECTE la langue du visiteur et réponds TOUJOURS dans la MÊME langue : darija marocaine (arabe dialectal), arabe classique, français, ou anglais. En darija, utilise un registre naturel (ex: "Salam! Ana hna bach n3awnek f l3qar dyalek..."). En arabe, utilise l'arabe standard moderne.
- Ton chaleureux, professionnel, concis. Réponses courtes et directement utiles.
- Mets en avant les services HOOMY quand pertinent : annonces vérifiées, conseillers dédiés, estimation gratuite, accompagnement personnalisé.

DONNÉES DE PRIX DE RÉFÉRENCE (Bank Al-Maghrib / ANCFCC, IPAI 2024, DH/m²) :
- Casablanca : Appartement 12 503, Villa 16 458
- Rabat : Appartement 12 392, Villa 13 066
- Marrakech : Appartement 14 720, Villa 19 686
- Tanger : Appartement 14 980, Villa 16 903
- Agadir : Appartement 5 060, Villa 7 026
- Skhirate-Témara : Appartement 9 004, Villa 10 991

Tu peux donner ces ordres de grandeur comme référence, mais pour une estimation précise d'un bien spécifique, oriente toujours vers l'outil gratuit : "Pour une estimation précise de votre bien, utilisez notre estimateur gratuit sur la page Estimer."
Ne JAMAIS inventer un prix exact pour un bien précis sans passer par l'estimateur.
Tu t'appelles "l'assistant HOOMY". Ne mentionne jamais Gemini, Google ou tout autre fournisseur IA.
`.trim();

// ─── Types ───────────────────────────────────────────────────────────────────

type Message = {
  role: "user" | "assistant";
  content: string;
};

// ─── Route Handler POST ───────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json() as { messages: Message[] };
    const { messages } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { erreur: "Historique de messages invalide." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[chat] GEMINI_API_KEY manquante dans .env.local");
      return NextResponse.json(
        { erreur: "Service IA non configuré. Contactez un conseiller." },
        { status: 500 }
      );
    }

    // Conversion au format Gemini : "assistant" → "model"
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const payload = {
      contents,
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
        topP: 0.9,
      },
    };

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const geminiData = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error("[chat] Erreur Gemini :", geminiData?.error);
      const erreurStatus = geminiData?.error?.status;
      const message =
        erreurStatus === "RESOURCE_EXHAUSTED"
          ? "Le service IA est temporairement saturé. Réessayez dans quelques instants."
          : "Le service IA est momentanément indisponible. Veuillez réessayer.";
      return NextResponse.json({ erreur: message }, { status: 503 });
    }

    const reply: string | undefined =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      console.error("[chat] Réponse vide de Gemini :", JSON.stringify(geminiData));
      return NextResponse.json(
        { erreur: "L'assistant n'a pas pu générer de réponse. Réessayez." },
        { status: 500 }
      );
    }

    return NextResponse.json({ reply: reply.trim() });
  } catch (err) {
    console.error("[chat] Erreur inattendue :", err);
    return NextResponse.json(
      { erreur: "Une erreur technique est survenue. Veuillez réessayer." },
      { status: 500 }
    );
  }
}
