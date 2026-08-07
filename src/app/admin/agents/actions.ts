"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

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
  role?: "agent" | "agence";
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

  // ── 1 bis. Validation (le téléphone est désormais OBLIGATOIRE) ─────────────
  const telephone = donnees.telephone.trim();
  if (!/^\+[1-9]\d{7,14}$/.test(telephone))
    throw new Error("Le numéro de téléphone est requis (format international +212…).");

  // Rôle choisi à l'invitation : agent (défaut) ou agence.
  const role: "agent" | "agence" = donnees.role === "agence" ? "agence" : "agent";

  // ── 2. Invitation via Supabase (service_role) ──────────────────────────────
  // C'est SUPABASE qui envoie l'e-mail : sa délivrance vers les adresses
  // externes (gmail…) est fiable, contrairement à notre SMTP mutualisé qui ne
  // délivre bien qu'en interne. redirectTo pointe sur pro.hoomy.ma : les agents
  // y vivent, et le parcours (callback → mot de passe → /pro/biens) doit s'y
  // dérouler pour que la session soit sur le bon sous-domaine.
  // Prérequis dashboard : « https://pro.hoomy.ma/auth/callback** » dans les
  // Redirect URLs Supabase, sinon le token est perdu (retour /connexion).
  const adminClient = createAdminClient();

  const { data: invited, error: inviteError } =
    await adminClient.auth.admin.inviteUserByEmail(donnees.email, {
      data: { nom_complet: donnees.nomComplet },
      redirectTo: `${getProUrl()}/auth/callback?next=/auth/definir-mot-de-passe`,
    });

  if (inviteError)
    throw new Error(traduireErreurInvitation(inviteError.message));
  if (!invited?.user)
    throw new Error("La création du compte a échoué — réessayez.");

  // ── 3. Mise à jour du profil (le trigger a créé la ligne de base) ──────────
  const { error: profilError } = await adminClient
    .from("profils")
    .upsert({
      id: invited.user.id,
      nom_complet: donnees.nomComplet,
      telephone,
      role,
      zones: donnees.zones.length > 0 ? donnees.zones : null,
    });

  if (profilError)
    throw new Error(`Compte créé mais profil non mis à jour : ${profilError.message}`);

  revalidatePath("/admin/agents");
}
