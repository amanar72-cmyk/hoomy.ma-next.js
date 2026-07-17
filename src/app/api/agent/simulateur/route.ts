import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { genererReponseAgent } from "@/lib/agent/cerveau";
import {
  trouverOuCreerConversation,
  chargerHistorique,
  enregistrerMessage,
  enregistrerMemoire,
  TELEPHONE_SIMULATEUR,
} from "@/lib/agent/conversation";

// SIMULATEUR de l'agent commercial IA — enveloppe fine autour du cerveau
// partagé (src/lib/agent/cerveau.ts, également utilisé par le webhook
// WhatsApp). Réservé à l'admin.
//
// Il ÉCRIT vraiment dans conversations_agent / messages_agent, sous le numéro
// fictif TELEPHONE_SIMULATEUR (+212000000000, canal 'simulateur') : c'est le
// cycle base (service_role, reprise du fil, fenêtre de 24 h) qui est neuf et
// risqué ici — un simulateur en mémoire ne le testerait pas et les bugs se
// découvriraient en prod, sur WhatsApp.
//
// DELETE /api/agent/simulateur réinitialise la conversation fictive.

export const runtime = "nodejs";
export const maxDuration = 60; // deux appels IA séquentiels

/** Garde admin partagée par POST et DELETE. null = autorisé. */
async function refuserSiPasAdmin(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erreur: "Non authentifié." }, { status: 401 });
  const { data: profil } = await supabase.from("profils").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") {
    return NextResponse.json({ erreur: "Réservé à l'administrateur." }, { status: 403 });
  }
  return null;
}

/**
 * Réinitialise la conversation fictive du simulateur (ON DELETE CASCADE
 * emporte les messages). Strictement limité au numéro fictif — aucune
 * conversation de vrai client n'est atteignable par cette route.
 */
export async function DELETE() {
  const refus = await refuserSiPasAdmin();
  if (refus) return refus;

  const admin = createAdminClient();
  const { error } = await admin
    .from("conversations_agent")
    .delete()
    .eq("telephone", TELEPHONE_SIMULATEUR);

  if (error) {
    return NextResponse.json({ erreur: `Réinitialisation échouée : ${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  // 1. Réservé à l'admin (le simulateur consomme l'API OpenAI)
  const refus = await refuserSiPasAdmin();
  if (refus) return refus;

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
    // Même cycle que le webhook — c'est tout l'intérêt : ce qui casse ici
    // casserait sur WhatsApp.
    const conversation = await trouverOuCreerConversation(TELEPHONE_SIMULATEUR, "simulateur");
    const historique = await chargerHistorique(conversation.id);
    await enregistrerMessage(conversation.id, "client", message);

    const resultat = await genererReponseAgent({
      message,
      historique,
      memoire: conversation.memoire,
    });

    await enregistrerMemoire(conversation.id, resultat.memoire);
    if (resultat.reponse.trim()) {
      await enregistrerMessage(conversation.id, "agent", resultat.reponse.trim());
    }

    return NextResponse.json({
      ...resultat,
      duree_ms: Date.now() - debut,
      // Diagnostic affiché par le simulateur : permet de voir la mémoire vivre
      // d'un tour à l'autre et de vérifier la reprise du fil.
      conversation_id: conversation.id,
      conversation_entamee: conversation.entamee,
      nb_messages_historique: historique.length,
    });
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
