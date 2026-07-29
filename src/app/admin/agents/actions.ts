"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { envoyerEmail } from "@/lib/email/envoyerEmail";
import { emailInvitationAgent } from "@/lib/email/emailInvitationAgent";

// URL publique de l'application (pour le lien d'invitation)
function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

// Messages d'erreur Supabase traduits en français
function traduireErreurInvitation(message: string): string {
  if (message.includes("already registered") || message.includes("already been registered"))
    return "Un compte existe déjà avec cette adresse e-mail.";
  if (message.includes("rate limit") || message.includes("email rate"))
    return "Trop d'invitations envoyées — réessayez dans quelques minutes.";
  if (message.includes("invalid email") || message.includes("Invalid email"))
    return "Adresse e-mail invalide.";
  return message;
}

type DonneesAgent = {
  nomComplet: string;
  email: string;
  telephone: string;
  zones: string[];
};

export async function ajouterAgent(donnees: DonneesAgent): Promise<void> {
  // ── 1. Vérification que l'appelant est admin ────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  const { data: profil } = await supabase
    .from("profils").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin")
    throw new Error("Accès refusé — réservé aux administrateurs.");

  // ── 2. Création du compte + génération du lien (service_role) ──────────────
  // generateLink (au lieu de inviteUserByEmail) crée le compte ET renvoie le
  // token SANS envoyer d'e-mail : on maîtrise ainsi le lien ET le message.
  const adminClient = createAdminClient();

  const { data: invited, error: inviteError } =
    await adminClient.auth.admin.generateLink({
      type: "invite",
      email: donnees.email,
      options: { data: { nom_complet: donnees.nomComplet } },
    });

  if (inviteError)
    throw new Error(traduireErreurInvitation(inviteError.message));
  if (!invited?.user || !invited.properties?.hashed_token)
    throw new Error("La création du compte a échoué — réessayez.");

  // Lien construit DIRECTEMENT vers notre callback avec le token_hash : il
  // court-circuite la redirection Supabase (et son allowlist), qui perdait le
  // token quand la query-string ?next= n'était pas whitelistée → atterrissage
  // sur /connexion sans code. verifyOtp(type:'invite') établit la session.
  const lien =
    `${getSiteUrl()}/auth/callback` +
    `?token_hash=${encodeURIComponent(invited.properties.hashed_token)}` +
    `&type=invite` +
    `&next=${encodeURIComponent("/auth/definir-mot-de-passe")}`;

  // ── 3. Mise à jour du profil (le trigger a créé la ligne de base) ──────────
  const { error: profilError } = await adminClient
    .from("profils")
    .upsert({
      id: invited.user.id,
      nom_complet: donnees.nomComplet,
      telephone: donnees.telephone || null,
      role: "agent",
      zones: donnees.zones.length > 0 ? donnees.zones : null,
    });

  if (profilError)
    throw new Error(`Compte créé mais profil non mis à jour : ${profilError.message}`);

  // ── 4. Envoi de l'e-mail d'invitation brandé (best-effort, ne throw pas) ───
  const { sujet, texte, html } = emailInvitationAgent({
    nomComplet: donnees.nomComplet,
    lien,
  });
  await envoyerEmail({ destinataire: donnees.email, sujet, texte, html });

  revalidatePath("/admin/agents");
}
