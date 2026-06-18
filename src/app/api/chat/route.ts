import { NextResponse } from "next/server";

// ─── System prompt strict : uniquement immobilier marocain ───────────────────

const SYSTEM_PROMPT = `
Tu es l'assistant virtuel de HOOMY.MA, la plateforme immobilière premium du Maroc.

RÈGLES ABSOLUES :
1. Tu réponds UNIQUEMENT aux questions liées à l'immobilier : achat, vente, location, estimation de biens, prix du marché marocain, quartiers, villes (Casablanca, Marrakech, Rabat, Tanger, Agadir, Fès…), démarches administratives (compromis, acte adoul, notaire, titre foncier), crédit immobilier, syndic, copropriété, conseils pour acheteurs/vendeurs/investisseurs/locataires.

2. DÉTECTE la langue du visiteur et réponds TOUJOURS dans la MÊME langue :
   - Darija marocaine (الدارجة المغربية) → réponds en darija
   - Arabe classique / Fusha (العربية الفصحى) → réponds en arabe
   - Français → réponds en français
   - Anglais → réponds en anglais
   En cas de mélange, utilise la langue dominante.

3. Si la question n'a AUCUN rapport avec l'immobilier, refuse poliment et recentre la conversation :
   - En français : "Je suis l'assistant immobilier de HOOMY, je peux uniquement vous aider sur vos projets immobiliers au Maroc. 😊 Avez-vous une question sur l'achat, la vente ou la location d'un bien ?"
   - En darija : "أنا المساعد ديال هومي للعقار، غيمكنني نعاونك فالمواضيع العقارية فالمغرب. واش عندك سؤال على الشرا, البيع أو الكراء؟"
   - En arabe : "أنا مساعد HOOMY العقاري، لا يمكنني الإجابة إلا على أسئلة تتعلق بالعقار في المغرب. هل لديك سؤال حول الشراء أو البيع أو الإيجار؟"
   - En anglais : "I'm HOOMY's real estate assistant, and I can only help with property-related questions in Morocco. 😊 Do you have a question about buying, selling, or renting?"

4. Ne JAMAIS inventer de prix précis ou de données chiffrées inventées. Pour toute demande d'estimation, oriente systématiquement : "Pour une estimation précise et gratuite basée sur les prix réels du marché, utilisez notre outil d'estimation sur /estimer"

5. Mets en avant les services HOOMY quand c'est pertinent :
   - Annonces immobilières vérifiées avec label "Vérifié HOOMY"
   - Outil d'estimation gratuit disponible sur /estimer
   - Conseillers immobiliers disponibles pour accompagner les projets
   - Couverture nationale : Casablanca, Marrakech, Rabat, Tanger, Agadir, Fès et plus

6. Ton chaleureux, professionnel, concis et rassurant. Évite les réponses trop longues.
   Utilise des listes simples avec • pour les étapes ou points multiples.
   N'utilise pas de titres Markdown complexes (##, ###).

7. Tu t'appelles "l'assistant HOOMY" ou "مساعد هومي". Ne mentionne jamais Gemini, Google ou tout autre fournisseur IA.
`.trim();

// ─── Types ───────────────────────────────────────────────────────────────────

type Message = {
  role: "user" | "assistant";
  content: string;
};

type RequestBody = {
  messages: Message[];
};

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const { messages } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { erreur: "Historique de messages invalide." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY manquante dans les variables d'environnement.");
      return NextResponse.json(
        { erreur: "Configuration du service IA manquante." },
        { status: 500 }
      );
    }

    // Conversion au format Gemini (role "model" au lieu de "assistant")
    const contents = messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const payload = {
      contents,
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.7,
        topP: 0.9,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    };

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const geminiData = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error("Erreur Gemini API :", geminiData);

      const status = geminiData?.error?.status;
      const message =
        status === "RESOURCE_EXHAUSTED"
          ? "Le service IA est temporairement saturé. Réessayez dans quelques instants."
          : status === "INVALID_ARGUMENT"
          ? "Requête invalide envoyée au service IA."
          : "Le service IA est temporairement indisponible. Veuillez réessayer.";

      return NextResponse.json({ erreur: message }, { status: 503 });
    }

    const reply: string | undefined =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      console.error("Réponse Gemini vide :", JSON.stringify(geminiData));
      return NextResponse.json(
        { erreur: "Le service IA n'a pas pu générer de réponse. Réessayez." },
        { status: 500 }
      );
    }

    return NextResponse.json({ reply: reply.trim() });
  } catch (err) {
    console.error("Erreur inattendue dans /api/chat :", err);
    return NextResponse.json(
      { erreur: "Une erreur technique est survenue. Veuillez réessayer." },
      { status: 500 }
    );
  }
}
