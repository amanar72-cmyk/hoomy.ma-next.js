// Template email HTML stylé HOOMY pour une nouvelle proposition de bien
// (place de marché inversée — demandes_recherche / propositions_bien).
// Styles INLINE uniquement (obligatoire pour la compatibilité email — la
// plupart des clients mail ignorent ou suppriment les <style> externes) ;
// mise en page par <table> (la méthode la plus fiable en email, Outlook en
// particulier ne supporte pas flexbox/grid). Polices HOOMY avec repli
// web-safe : la plupart des clients mail ignorent les Google Fonts, l'email
// reste lisible et dans l'esprit de la charte grâce aux couleurs + repli serif.

import type { DemandeRecherche, PropositionBien } from "@/lib/demandes/types";
import { LIBELLE_TRANSACTION, formaterFourchetteBudget } from "@/lib/demandes/types";

const VERT_ROYAL = "#0F4C3A";
const OR = "#D4AF37";
const FOND = "#FAF7F0";

// Échappement HTML — OBLIGATOIRE : `valeur` provient de champs libres soumis
// par un visiteur non authentifié via /api/demandes/proposer (description,
// atouts, nom_agence, adresse_approx...). Sans ça, une proposition contenant
// par ex. un <img onerror=...> s'insère telle quelle dans l'email HTML reçu
// par l'admin/l'agent — vérifié par audit sécurité.
function echapperHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ligne(label: string, valeur: string | number | null | undefined): string {
  if (valeur === null || valeur === undefined || valeur === "") return "";
  const valeurSure = typeof valeur === "string" ? echapperHtml(valeur) : valeur;
  return `
    <tr>
      <td style="padding:4px 12px 4px 0;color:#6B7A71;font-size:13px;white-space:nowrap;vertical-align:top;">${label}</td>
      <td style="padding:4px 0;color:#1A2822;font-size:13px;">${valeurSure}</td>
    </tr>`;
}

export function construireEmailProposition(params: {
  demande: DemandeRecherche;
  proposition: PropositionBien;
  urlBackOffice: string;
}): { sujet: string; texte: string; html: string } {
  const { demande, proposition, urlBackOffice } = params;

  const sujet = `🏠 Nouvelle proposition — ${demande.reference} (${demande.ville})`;

  const nomProposeur = [proposition.prenom, proposition.nom].filter(Boolean).join(" ");
  const nomDemandeur = [demande.prenom, demande.nom].filter(Boolean).join(" ");
  const budget = formaterFourchetteBudget(demande.budget_min, demande.budget_max);

  const texte = [
    `Nouvelle proposition reçue pour la demande ${demande.reference}.`,
    "",
    `── Demande concernée (${demande.reference}) ──`,
    `Client : ${nomDemandeur} — ${demande.telephone}${demande.email ? ` — ${demande.email}` : ""}`,
    `Recherche : ${LIBELLE_TRANSACTION[demande.transaction]} — ${demande.type_bien ?? "type non précisé"} à ${demande.ville}`,
    budget ? `Budget : ${budget}` : null,
    "",
    `── Proposeur ──`,
    `${nomProposeur} — ${proposition.profil_proposeur === "agence" ? `Agence${proposition.nom_agence ? ` (${proposition.nom_agence})` : ""}` : "Particulier"}`,
    `Téléphone : ${proposition.telephone}${proposition.email ? ` — Email : ${proposition.email}` : ""}`,
    "",
    `── Bien proposé ──`,
    `${proposition.type ?? "Type non précisé"} — ${proposition.ville ?? ""}${proposition.quartier ? `, ${proposition.quartier}` : ""}`,
    proposition.prix ? `Prix : ${new Intl.NumberFormat("fr-FR").format(proposition.prix)} DH` : null,
    proposition.surface ? `Surface : ${proposition.surface} m²` : null,
    proposition.description ? `Description : ${proposition.description}` : null,
    proposition.atouts ? `Atouts : ${proposition.atouts}` : null,
    "",
    `Voir dans le back-office : ${urlBackOffice}`,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:${FOND};font-family:Outfit,Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FOND};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:16px;overflow:hidden;">

          <!-- En-tête -->
          <tr>
            <td style="background:${VERT_ROYAL};padding:24px 28px;">
              <div style="font-family:Marcellus,Georgia,serif;color:#FFFFFF;font-size:20px;letter-spacing:0.04em;">
                HOOMY<span style="color:${OR};">.MA</span>
              </div>
              <div style="color:${OR};font-size:13px;margin-top:6px;font-weight:600;">
                🏠 Nouvelle proposition de bien
              </div>
            </td>
          </tr>

          <!-- Corps -->
          <tr>
            <td style="padding:24px 28px;">

              <div style="display:inline-block;background:#F0FAF4;color:${VERT_ROYAL};font-size:12px;font-weight:700;padding:4px 12px;border-radius:999px;margin-bottom:16px;">
                ${demande.reference}
              </div>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr><td style="font-family:Marcellus,Georgia,serif;color:${VERT_ROYAL};font-size:15px;padding-bottom:8px;">Demande concernée</td></tr>
                ${ligne("Client", nomDemandeur)}
                ${ligne("Téléphone", demande.telephone)}
                ${demande.email ? ligne("Email", demande.email) : ""}
                ${ligne("Recherche", `${LIBELLE_TRANSACTION[demande.transaction]} — ${demande.type_bien ?? "—"} à ${demande.ville}`)}
                ${budget ? ligne("Budget", budget) : ""}
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border-top:1px solid #EDE7D7;padding-top:16px;">
                <tr><td style="font-family:Marcellus,Georgia,serif;color:${VERT_ROYAL};font-size:15px;padding-bottom:8px;">Proposeur</td></tr>
                ${ligne("Nom", nomProposeur)}
                ${ligne("Profil", proposition.profil_proposeur === "agence" ? `Agence${proposition.nom_agence ? ` — ${proposition.nom_agence}` : ""}` : "Particulier (propriétaire)")}
                ${ligne("Téléphone", proposition.telephone)}
                ${proposition.email ? ligne("Email", proposition.email) : ""}
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-top:1px solid #EDE7D7;padding-top:16px;">
                <tr><td style="font-family:Marcellus,Georgia,serif;color:${VERT_ROYAL};font-size:15px;padding-bottom:8px;">Bien proposé</td></tr>
                ${ligne("Type", proposition.type)}
                ${ligne("Localisation", [proposition.ville, proposition.quartier].filter(Boolean).join(", ") || null)}
                ${ligne("Adresse approx.", proposition.adresse_approx)}
                ${ligne("Prix", proposition.prix ? `${new Intl.NumberFormat("fr-FR").format(proposition.prix)} DH` : null)}
                ${ligne("Surface", proposition.surface ? `${proposition.surface} m²` : null)}
                ${ligne("Chambres", proposition.chambres)}
                ${ligne("Salles de bain", proposition.salles_bain)}
                ${ligne("Étage", proposition.etage)}
                ${ligne("Description", proposition.description)}
                ${ligne("Atouts", proposition.atouts)}
                ${ligne("Lien annonce", proposition.lien_annonce)}
                ${ligne("Photos jointes", proposition.photos?.length ? `${proposition.photos.length}` : null)}
              </table>

              <a href="${urlBackOffice}"
                 style="display:inline-block;background:${OR};color:${VERT_ROYAL};font-weight:700;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:10px;">
                Voir la proposition dans le back-office
              </a>

            </td>
          </tr>

          <tr>
            <td style="padding:16px 28px;background:#F7F5F0;color:#9DB8AD;font-size:11px;">
              HOOMY.MA — notification automatique, place de marché des demandes de recherche.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { sujet, texte, html };
}
