import "server-only";

// PERSISTANCE des conversations de l'agent IA (tables conversations_agent et
// messages_agent — voir agent_conversations.sql).
//
// Pourquoi service_role : les appelants (webhook Twilio, simulateur) n'ont
// AUCUNE session utilisateur — Twilio est un service externe. Ces tables sont
// fermées à anon/authenticated par RLS (elles contiennent des conversations de
// clients), donc l'écriture ne peut passer que par service_role.
// "server-only" garantit qu'une fuite de ce module côté client casse le build.
//
// La recherche de biens, elle, reste sur la clé ANON dans cerveau.ts : le
// service_role est cantonné à ces deux tables et ne doit pas contourner la RLS
// des annonces par effet de bord.

import { createAdminClient } from "@/lib/supabase/admin";
import type { CriteresAgent } from "./cerveau";

/** Fenêtre WhatsApp : au-delà, le fil est considéré comme une nouvelle conversation. */
const FENETRE_MS = 24 * 60 * 60 * 1000;

/** Nombre de messages d'historique rejoués au modèle (10 échanges environ). */
export const LIMITE_HISTORIQUE = 20;

/** Numéro fictif réservé au simulateur admin — jamais un vrai client. */
export const TELEPHONE_SIMULATEUR = "+212000000000";

export type RoleMessage = "client" | "agent";

export type MessageAgent = {
  role: RoleMessage;
  contenu: string;
};

export type ConversationAgent = {
  id: string;
  memoire: Partial<CriteresAgent>;
  /** false = fil rouvert (nouveau) → l'agent peut saluer. true = fil en cours. */
  entamee: boolean;
};

/**
 * Normalise un numéro au format E.164 (+212...).
 * Twilio envoie "whatsapp:+212600000000" — le préfixe est retiré ici pour que
 * la colonne telephone reste un numéro comparable d'un canal à l'autre.
 */
export function normaliserTelephone(brut: string): string {
  const sansPrefixe = brut.replace(/^whatsapp:/i, "").trim();
  // Ne garde que les chiffres et le + de tête
  const nettoye = sansPrefixe.replace(/[^\d+]/g, "");
  return nettoye.startsWith("+") ? nettoye : `+${nettoye}`;
}

/**
 * Retrouve la conversation ouverte du numéro, ou en ouvre une nouvelle.
 *
 * Règle : on réutilise le fil existant si son dernier message date de moins de
 * 24 h (maj_le, tenu à jour par trigger). Au-delà, ou si le fil a été clos ou
 * transféré à un humain, on repart d'une conversation vierge — sans mémoire,
 * car des critères vieux d'un jour ne valent plus rien.
 */
export async function trouverOuCreerConversation(
  telephone: string,
  canal = "whatsapp"
): Promise<ConversationAgent> {
  const admin = createAdminClient();
  const numero = normaliserTelephone(telephone);

  // statut 'auto' uniquement : un fil transféré à un humain ne doit PAS être
  // repris par l'agent, et un fil clos est terminé.
  const { data: existante, error } = await admin
    .from("conversations_agent")
    .select("id, memoire, maj_le")
    .eq("telephone", numero)
    .eq("statut", "auto")
    .order("maj_le", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Lecture conversation échouée : ${error.message}`);

  if (existante) {
    const age = Date.now() - new Date(existante.maj_le).getTime();
    if (age < FENETRE_MS) {
      return {
        id: existante.id,
        memoire: (existante.memoire ?? {}) as Partial<CriteresAgent>,
        entamee: true,
      };
    }
  }

  const { data: creee, error: erreurCreation } = await admin
    .from("conversations_agent")
    .insert({ telephone: numero, canal })
    .select("id")
    .single();

  if (erreurCreation || !creee) {
    throw new Error(`Création conversation échouée : ${erreurCreation?.message ?? "inconnue"}`);
  }

  return { id: creee.id, memoire: {}, entamee: false };
}

/** Les LIMITE_HISTORIQUE derniers messages, rendus dans l'ordre chronologique. */
export async function chargerHistorique(conversationId: string): Promise<MessageAgent[]> {
  const admin = createAdminClient();

  // Tri décroissant pour prendre les N PLUS RÉCENTS, puis remise en ordre
  // chronologique : un tri croissant + limit renverrait les N plus ANCIENS et
  // l'agent perdrait le fil récent.
  const { data, error } = await admin
    .from("messages_agent")
    .select("role, contenu")
    .eq("conversation_id", conversationId)
    .order("cree_le", { ascending: false })
    .limit(LIMITE_HISTORIQUE);

  if (error) throw new Error(`Lecture historique échouée : ${error.message}`);

  return ((data ?? []) as MessageAgent[]).reverse();
}

export async function enregistrerMessage(
  conversationId: string,
  role: RoleMessage,
  contenu: string
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("messages_agent")
    .insert({ conversation_id: conversationId, role, contenu });

  if (error) throw new Error(`Écriture message échouée : ${error.message}`);
}

/** Persiste la mémoire fusionnée. maj_le est déjà touché par le trigger. */
export async function enregistrerMemoire(
  conversationId: string,
  memoire: Partial<CriteresAgent>
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("conversations_agent")
    .update({ memoire })
    .eq("id", conversationId);

  if (error) throw new Error(`Écriture mémoire échouée : ${error.message}`);
}
