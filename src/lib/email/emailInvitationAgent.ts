// Template email HOOMY pour l'invitation d'un agent (back-office pro).
// Styles INLINE + mise en page <table> (compatibilité clients mail, Outlook
// inclus). Envoyé via notre SMTP (envoyerEmail), PAS par Supabase : le lien
// pointe directement sur /auth/callback avec le token_hash, ce qui rend le
// flux indépendant de l'allowlist de redirection Supabase.

const VERT_ROYAL = "#0F4C3A";
const OR = "#D4AF37";
const FOND = "#FAF7F0";

// Échappement HTML — le nom vient d'un champ libre saisi par l'admin ; sans ça
// un nom contenant du HTML s'insérerait tel quel dans l'email reçu.
function echapperHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type InvitationAgent = {
  nomComplet: string;
  /** Lien d'activation (…/auth/callback?token_hash=…&type=invite&next=…). */
  lien: string;
};

export function emailInvitationAgent({ nomComplet, lien }: InvitationAgent): {
  sujet: string;
  texte: string;
  html: string;
} {
  const nom = echapperHtml(nomComplet.trim());
  // Le lien est construit côté serveur (jamais une saisie utilisateur) mais on
  // échappe malgré tout les guillemets pour rester sûr dans l'attribut href.
  const lienSur = lien.replace(/"/g, "&quot;");

  const sujet = "Votre invitation à rejoindre l'espace pro HOOMY";

  // Repli texte — TOUJOURS fourni (clients sans HTML, filtres anti-spam).
  const texte = [
    `Bonjour ${nomComplet.trim()},`,
    "",
    "Vous avez été invité(e) à rejoindre HOOMY en tant que conseiller.",
    "Pour activer votre compte, créez votre mot de passe via ce lien :",
    "",
    lien,
    "",
    "Votre mot de passe doit contenir au moins 10 caractères, dont une majuscule, un chiffre et un caractère spécial.",
    "",
    "Ce lien est personnel. Si vous n'êtes pas concerné(e), ignorez cet e-mail.",
    "",
    "— L'équipe HOOMY",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${FOND};font-family:Outfit,Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FOND};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:16px;overflow:hidden;">

        <!-- En-tête -->
        <tr>
          <td style="background:${VERT_ROYAL};padding:24px 28px;">
            <div style="font-family:Marcellus,Georgia,serif;color:#FFFFFF;font-size:20px;letter-spacing:0.04em;">
              HOOMY<span style="color:${OR};">.MA</span>
            </div>
          </td>
        </tr>

        <!-- Corps -->
        <tr>
          <td style="padding:28px;">
            <div style="display:inline-block;background:#F0FAF4;color:${VERT_ROYAL};font-size:12px;font-weight:700;padding:4px 12px;border-radius:999px;margin-bottom:16px;">
              Invitation
            </div>

            <div style="font-family:Marcellus,Georgia,serif;color:${VERT_ROYAL};font-size:22px;margin-bottom:12px;">
              Bienvenue dans l'espace pro HOOMY
            </div>

            <p style="color:#3D4A42;font-size:15px;line-height:1.6;margin:0 0 12px;">
              Bonjour <strong>${nom}</strong>,
            </p>
            <p style="color:#3D4A42;font-size:15px;line-height:1.6;margin:0 0 24px;">
              Vous avez été invité(e) à rejoindre HOOMY en tant que conseiller. Pour activer
              votre compte, créez votre mot de passe en cliquant ci-dessous.
            </p>

            <!-- CTA -->
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr><td>
                <a href="${lienSur}"
                   style="display:inline-block;background:${OR};color:${VERT_ROYAL};font-weight:700;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:10px;">
                  Créer mon mot de passe
                </a>
              </td></tr>
            </table>

            <p style="color:#6B7A71;font-size:13px;line-height:1.6;margin:0 0 8px;">
              Votre mot de passe devra contenir au moins <strong>10 caractères</strong>, dont une
              majuscule, un chiffre et un caractère spécial.
            </p>
            <p style="color:#9DB8AD;font-size:12px;line-height:1.6;margin:0;">
              Ce lien est personnel. Si vous n'êtes pas concerné(e), ignorez simplement cet e-mail.
            </p>

            <!-- Repli lien brut -->
            <p style="color:#9DB8AD;font-size:11px;line-height:1.5;margin:20px 0 0;word-break:break-all;">
              Le bouton ne fonctionne pas ? Copiez ce lien :<br>${lienSur}
            </p>
          </td>
        </tr>

        <!-- Pied -->
        <tr>
          <td style="padding:16px 28px;background:#F7F5F0;color:#9DB8AD;font-size:11px;">
            HOOMY.MA — e-mail automatique d'invitation. Merci de ne pas y répondre.
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { sujet, texte, html };
}
