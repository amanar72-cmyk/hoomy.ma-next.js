"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { envoyerEmail } from "@/lib/email/envoyerEmail";
import { emailInvitationAgent } from "@/lib/email/emailInvitationAgent";

// Base du lien d'invitation. Les agents vivent sur pro.hoomy.ma : tout le
// parcours (callback → définition du mot de passe → /pro/biens) doit s'y
// dérouler. Un lien vers hoomy.ma poserait la session sur le mauvais
// sous-domaine, perdue au moment du renvoi vers /pro/biens.
function getProUrl(): string {
  // Variable dédiée en priorité (à poser sur Hostinger : https://pro.hoomy.ma)
  if (process.env.NEXT_PUBLIC_PRO_URL) return process.env.NEXT_PUBLIC_PRO_URL;
  // À défaut, dériver du domaine public en préfixant « pro. »
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) {
    try {
      const u = new URL(site);
      if (!u.hostname.startsWith("pro.")) {
        u.hostname = "pro." + u.hostname.replace(/^www\./, "");
      }
      return u.origin;
    } catch {
      /* URL mal formée → repli local ci-dessous */
    }
  }
  // En local, pas de sous-domaine : /admin et /pro sont servis depuis localhost.
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

export type ResultatInvitation = {
  /** true = l'e-mail brandé est bien parti. false = SMTP en échec. */
  emailEnvoye: boolean;
  /** Raison de l'échec SMTP, le cas échéant (pour diagnostic admin). */
  erreurEmail?: string;
  /** Lien d'activation — permis à l'admin de le transmettre à la main si l'e-mail n'est pas parti. */
  lien: string;
};

export async function ajouterAgent(donnees: DonneesAgent): Promise<ResultatInvitation> {
  // ── 1. Vérification que l'appelant est admin ────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  const { data: profil } = await supabase
    .from("profils").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin")
    throw new Error("Accès refusé — réservé aux administrateurs.");

  // ── 1 bis. Validation (le téléphone est désormais OBLIGATOIRE) ─────────────
  const telephone = donnees.telephone.trim();
  if (!/^\+[1-9]\d{7,14}$/.test(telephone))
    throw new Error("Le numéro de téléphone est requis (format international +212…).");

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
    `${getProUrl()}/auth/callback` +
    `?token_hash=${encodeURIComponent(invited.properties.hashed_token)}` +
    `&type=invite` +
    `&next=${encodeURIComponent("/auth/definir-mot-de-passe")}`;

  // ── 3. Mise à jour du profil (le trigger a créé la ligne de base) ──────────
  const { error: profilError } = await adminClient
    .from("profils")
    .upsert({
      id: invited.user.id,
      nom_complet: donnees.nomComplet,
      telephone,
      role: "agent",
      zones: donnees.zones.length > 0 ? donnees.zones : null,
    });

  if (profilError)
    throw new Error(`Compte créé mais profil non mis à jour : ${profilError.message}`);

  // ── 4. Envoi de l'e-mail d'invitation brandé ───────────────────────────────
  // On NE throw PAS : le compte est déjà créé. On remonte plutôt l'état de
  // l'envoi à l'admin — s'il échoue (SMTP mal configuré en prod), l'admin voit
  // la vraie raison ET reçoit le lien pour le transmettre à la main, au lieu
  // d'un faux « succès » silencieux.
  const { sujet, texte, html } = emailInvitationAgent({
    nomComplet: donnees.nomComplet,
    lien,
  });
  const envoi = await envoyerEmail({ destinataire: donnees.email, sujet, texte, html });

  revalidatePath("/admin/agents");

  return { emailEnvoye: envoi.ok, erreurEmail: envoi.erreur, lien };
}
