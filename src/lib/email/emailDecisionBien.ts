// Template email HOOMY : décision du back-office sur une annonce d'agent
// (publiée ou rejetée). Même charte que emailInvitationAgent — styles INLINE
// et mise en page <table> (compatibilité clients mail, Outlook inclus).

const VERT_ROYAL = "#0F4C3A";
const OR = "#D4AF37";
const FOND = "#FAF7F0";
const ROUGE = "#B42318";

function echapperHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type DecisionBien = {
  nomAgent: string;
  titre: string;
  reference: string | null;
  /** "publie" = annonce en ligne ; "rejete" = à corriger. */
  decision: "publie" | "rejete";
  /** Publié → URL publique de l'annonce ; rejeté → fiche pro du bien. */
  lien: string;
};

export function emailDecisionBien({ nomAgent, titre, reference, decision, lien }: DecisionBien): {
  sujet: string;
  texte: string;
  html: string;
} {
  const nom = echapperHtml((nomAgent || "").trim()) || "cher conseiller";
  const titreSur = echapperHtml(titre.trim());
  const ref = reference ? echapperHtml(reference) : null;
  const lienSur = lien.replace(/"/g, "&quot;");
  const publie = decision === "publie";

  const badge = publie ? "Annonce publiée" : "Annonce à corriger";
  const accent = publie ? VERT_ROYAL : ROUGE;
  const titreBloc = publie ? "Votre annonce est en ligne 🎉" : "Votre annonce nécessite une révision";
  const message = publie
    ? "Bonne nouvelle : après vérification par le back-office, votre annonce est désormais publiée et visible par les acheteurs sur HOOMY.MA."
    : "Après examen par le back-office, votre annonce n'a pas pu être publiée en l'état. Ouvrez la fiche pour vérifier les informations, puis contactez le back-office pour la remettre en ligne.";
  const cta = publie ? "Voir l'annonce en ligne" : "Ouvrir la fiche du bien";
  const ctaFond = publie ? OR : VERT_ROYAL;
  const ctaTexte = publie ? VERT_ROYAL : "#FFFFFF";

  const sujet = publie
    ? `✅ Votre annonce est publiée — ${titre.trim()}`
    : `⚠️ Votre annonce nécessite une révision — ${titre.trim()}`;

  const texte = [
    `Bonjour ${(nomAgent || "").trim() || "cher conseiller"},`,
    "",
    publie
      ? "Votre annonce vient d'être PUBLIÉE par le back-office et est visible sur HOOMY.MA."
      : "Votre annonce a été REJETÉE par le back-office et nécessite une révision.",
    "",
    `Bien : ${titre.trim()}`,
    ref ? `Référence : ${reference}` : null,
    "",
    publie ? "Voir l'annonce en ligne :" : "Ouvrir la fiche du bien :",
    lien,
    "",
    "— L'équipe HOOMY",
  ].filter((l): l is string => l !== null).join("\n");

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
            <div style="display:inline-block;background:${publie ? "#F0FAF4" : "#FDECEA"};color:${accent};font-size:12px;font-weight:700;padding:4px 12px;border-radius:999px;margin-bottom:16px;">
              ${badge}
            </div>

            <div style="font-family:Marcellus,Georgia,serif;color:${accent};font-size:22px;margin-bottom:12px;">
              ${titreBloc}
            </div>

            <p style="color:#3D4A42;font-size:15px;line-height:1.6;margin:0 0 12px;">
              Bonjour <strong>${nom}</strong>,
            </p>
            <p style="color:#3D4A42;font-size:15px;line-height:1.6;margin:0 0 20px;">
              ${message}
            </p>

            <!-- Récap bien -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5F0;border-radius:10px;margin:0 0 24px;">
              <tr><td style="padding:14px 16px;">
                <div style="color:${VERT_ROYAL};font-size:15px;font-weight:700;margin-bottom:4px;">${titreSur}</div>
                ${ref ? `<div style="color:#6B7A71;font-size:12px;font-family:monospace;">${ref}</div>` : ""}
              </td></tr>
            </table>

            <!-- CTA -->
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
              <tr><td>
                <a href="${lienSur}"
                   style="display:inline-block;background:${ctaFond};color:${ctaTexte};font-weight:700;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:10px;">
                  ${cta}
                </a>
              </td></tr>
            </table>

            <p style="color:#9DB8AD;font-size:11px;line-height:1.5;margin:20px 0 0;word-break:break-all;">
              Le bouton ne fonctionne pas ? Copiez ce lien :<br>${lienSur}
            </p>
          </td>
        </tr>

        <!-- Pied -->
        <tr>
          <td style="padding:16px 28px;background:#F7F5F0;color:#9DB8AD;font-size:11px;">
            HOOMY.MA — e-mail automatique. Merci de ne pas y répondre.
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { sujet, texte, html };
}
