import { NextRequest, NextResponse } from "next/server";

type BienPourIA = {
  titre: string;
  type: string;
  ville: string;
  quartier: string | null;
  surface: number;
  prix: number;
  prixM2: number | null;
  chambres: number;
  sallesBain: number;
  charges: number | null;
  scoreQuartier: number | null;
  transaction: string;
};

export async function POST(req: NextRequest) {
  try {
    const { biens }: { biens: BienPourIA[] } = await req.json();

    if (!biens || biens.length < 2) {
      return NextResponse.json({ erreur: "Au moins 2 biens requis" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ erreur: "Clé API manquante" }, { status: 500 });
    }

    const listeBiens = biens
      .map((b, i) => {
        const lignes = [
          `**Bien ${i + 1} — ${b.titre}**`,
          `Type : ${b.type} | ${b.transaction === "location" ? "Location" : "Vente"}`,
          `Localisation : ${b.quartier ? b.quartier + ", " : ""}${b.ville}`,
          `Prix : ${b.prix.toLocaleString("fr-FR")} DH${b.transaction === "location" ? "/mois" : ""}`,
          `Surface : ${b.surface} m²${b.prixM2 ? ` | Prix/m² : ${b.prixM2.toLocaleString("fr-FR")} DH/m²` : ""}`,
          `${b.chambres} chambre(s) | ${b.sallesBain} SDB`,
          b.charges ? `Charges : ${b.charges.toLocaleString("fr-FR")} DH/mois` : null,
          b.scoreQuartier !== null ? `Score quartier : ${b.scoreQuartier}/100` : null,
        ]
          .filter(Boolean)
          .join("\n");
        return lignes;
      })
      .join("\n\n");

    const prompt = `Tu es un conseiller immobilier expert de HOOMY.MA, spécialisé dans le marché immobilier marocain.

Voici ${biens.length} biens immobiliers à comparer :

${listeBiens}

Effectue une analyse comparative concise et professionnelle en français. Réponds UNIQUEMENT en JSON valide avec cette structure exacte :
{
  "analyse": "Paragraphe comparant objectivement les biens (prix, surface, localisation, rapport qualité/prix). 3-4 phrases.",
  "meilleur_rapport": "Quel bien offre le meilleur rapport qualité/prix et pourquoi. 2-3 phrases.",
  "pour_habiter": "Recommandation pour un acheteur souhaitant habiter le bien. 2-3 phrases.",
  "pour_investir": "Recommandation pour un investisseur locatif (rendement, demande locative, charges). 2-3 phrases."
}

Sois factuel, concis et objectif. Base-toi uniquement sur les données fournies.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 900 },
        }),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ erreur: "Erreur Gemini API" }, { status: 502 });
    }

    const json = await res.json();
    const texte: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    const match = texte.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json({ erreur: "Réponse IA invalide" }, { status: 502 });
    }

    const analyse = JSON.parse(match[0]);
    return NextResponse.json({ analyse });
  } catch {
    return NextResponse.json({ erreur: "Erreur interne" }, { status: 500 });
  }
}
