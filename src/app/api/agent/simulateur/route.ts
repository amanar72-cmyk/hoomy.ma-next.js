import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { genererReponseAgent } from "@/lib/agent/cerveau";

// SIMULATEUR de l'agent commercial IA — enveloppe fine autour du cerveau
// partagé (src/lib/agent/cerveau.ts, également utilisé par le webhook
// WhatsApp). Lecture seule, réservé à l'admin. Réponse au format identique
// à la version précédente : { intention, langue, criteres, biens, reponse,
// duree_ms }.

export const runtime = "nodejs";
export const maxDuration = 60; // deux appels IA séquentiels

export async function POST(req: NextRequest) {
  // 1. Réservé à l'admin (le simulateur consomme l'API OpenAI)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erreur: "Non authentifié." }, { status: 401 });
  const { data: profil } = await supabase.from("profils").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") {
    return NextResponse.json({ erreur: "Réservé à l'administrateur." }, { status: 403 });
  }

  // 2. Clé API — jamais côté client
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { erreur: "OPENAI_API_KEY manquante. Ajoutez-la dans .env.local (et Hostinger) puis redémarrez." },
      { status: 503 }
    );
  }

  // 3. Message client
  let corps: { message?: string };
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: "JSON invalide." }, { status: 400 });
  }
  const message = (corps.message ?? "").trim();
  if (!message) return NextResponse.json({ erreur: "Message vide." }, { status: 400 });

  const debut = Date.now();

  try {
    const resultat = await genererReponseAgent(message);
    return NextResponse.json({ ...resultat, duree_ms: Date.now() - debut });
  } catch (e) {
    // Erreurs typées du SDK OpenAI — du plus spécifique au plus général
    if (e instanceof OpenAI.AuthenticationError) {
      return NextResponse.json({ erreur: "Clé OPENAI_API_KEY invalide ou révoquée." }, { status: 502 });
    }
    if (e instanceof OpenAI.RateLimitError) {
      // 429 « insufficient_quota » = plus de crédit sur le compte (facturation),
      // à distinguer d'une vraie limite de débit passagère
      const sansCredit = (e as { code?: string | null }).code === "insufficient_quota";
      return NextResponse.json(
        {
          erreur: sansCredit
            ? "Crédit OpenAI épuisé — rechargez le compte sur platform.openai.com (Billing) puis réessayez."
            : "Limite de débit OpenAI atteinte — réessayez dans un instant.",
        },
        { status: 429 }
      );
    }
    if (e instanceof OpenAI.APIConnectionTimeoutError) {
      return NextResponse.json({ erreur: "Délai dépassé (30 s) — l'API OpenAI n'a pas répondu à temps." }, { status: 504 });
    }
    if (e instanceof OpenAI.APIConnectionError) {
      return NextResponse.json({ erreur: "Connexion à l'API OpenAI impossible." }, { status: 504 });
    }
    if (e instanceof OpenAI.APIError) {
      return NextResponse.json({ erreur: `Erreur API OpenAI (${e.status}) : ${e.message}` }, { status: 502 });
    }
    console.error("[agent simulateur] échec :", e);
    return NextResponse.json(
      { erreur: e instanceof Error ? e.message : "Erreur interne." },
      { status: 500 }
    );
  }
}
