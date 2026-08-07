import { envoyerEmail } from "./envoyerEmail";
import { emailDecisionBien } from "./emailDecisionBien";
import { formaterPrix } from "@/lib/format";
import { CONTACT } from "@/lib/contact";

/**
 * Prévient HOOMY (contact@hoomy.ma) qu'un bien vient d'être TRANSMIS au
 * back-office pour validation, en indiquant qui l'a envoyé (agence ou agent,
 * avec son nom). Best-effort. Destinataire interne @hoomy.ma → délivré par le
 * SMTP Hostinger.
 */
export async function notifierBienTransmis(donnees: {
  titre: string;
  ville: string;
  prix: number;
  transaction: string;
  reference: string | null;
  auteur: string; // ex. « Immo Casa (Agence) » ou « Karim B. (Agent) »
}): Promise<void> {
  await envoyerEmail({
    destinataire: CONTACT.email,
    sujet: `📥 Bien transmis au back-office — ${donnees.titre}`,
    texte: [
      "Un bien vient d'être transmis au back-office pour validation.",
      "",
      `Envoyé par : ${donnees.auteur}`,
      `Référence : ${donnees.reference ?? "—"}`,
      `Titre : ${donnees.titre}`,
      `Ville : ${donnees.ville}`,
      `Prix : ${formaterPrix(donnees.prix, donnees.transaction)}`,
      "",
      "À traiter : https://hoomy.ma/admin/verifications",
    ].join("\n"),
  });
}

// Base du back-office pro (pro.hoomy.ma) — même logique que getProUrl côté
// invitation d'agent. Sert à construire le lien de la fiche dans l'e-mail.
function baseProUrl(): string {
  if (process.env.NEXT_PUBLIC_PRO_URL) return process.env.NEXT_PUBLIC_PRO_URL;
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) {
    try {
      const u = new URL(site);
      if (!u.hostname.startsWith("pro.")) u.hostname = "pro." + u.hostname.replace(/^www\./, "");
      return u.origin;
    } catch {
      /* URL mal formée → repli ci-dessous */
    }
  }
  return "https://pro.hoomy.ma";
}

/**
 * Prévient l'agent, par e-mail, que le back-office a publié ou rejeté son
 * annonce. Best-effort (n'interrompt jamais l'action métier).
 */
export async function notifierAgentDecisionBien(donnees: {
  destinataire: string;
  nomAgent: string | null;
  bienId: string;
  titre: string;
  reference: string | null;
  slug: string | null;
  transaction: string;
  decision: "publie" | "rejete";
}): Promise<void> {
  const baseSite = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hoomy.ma";
  const segment = donnees.transaction === "location" ? "louer" : "acheter";
  const lien =
    donnees.decision === "publie"
      ? `${baseSite}/${segment}/${donnees.slug ?? donnees.bienId}`
      : `${baseProUrl()}/pro/biens/${donnees.bienId}`;

  const { sujet, texte, html } = emailDecisionBien({
    nomAgent: donnees.nomAgent ?? "",
    titre: donnees.titre,
    reference: donnees.reference,
    decision: donnees.decision,
    lien,
  });

  await envoyerEmail({ destinataire: donnees.destinataire, sujet, texte, html });
}


export async function notifierNouveauBien(donnees: {
  titre: string;
  ville: string;
  prix: number;
  transaction: string;
  reference: string | null;
  auteur: string;
}): Promise<void> {
  await envoyerEmail({
    sujet: `🏠 Nouveau bien reçu — ${donnees.titre}`,
    texte: [
      "Un nouveau bien vient d'être soumis sur HOOMY.MA.",
      "",
      `Référence : ${donnees.reference ?? "—"}`,
      `Titre : ${donnees.titre}`,
      `Ville : ${donnees.ville}`,
      `Prix : ${formaterPrix(donnees.prix, donnees.transaction)}`,
      `Soumis par : ${donnees.auteur}`,
    ].join("\n"),
  });
}

// Libellés lisibles pour l'email de notification lead
const LIBELLES_SCORE: Record<string, string> = {
  chaud: "🔥 CHAUD",
  tiede: "🌤 Tiède",
  froid: "❄️ Froid",
};

export async function notifierNouveauLead(donnees: {
  nom: string;
  telephone: string;
  email: string | null;
  typeProjet: string;
  budget: string | null;
  financement: string | null;
  delai: string | null;
  profilClient: string | null;
  zones: string[] | null;
  source: string;
  titreBien: string | null;
  score: string | null;
}): Promise<void> {
  const score = donnees.score ? LIBELLES_SCORE[donnees.score] ?? donnees.score : "—";

  const lignes = [
    "Nouveau lead qualifié sur HOOMY.MA.",
    "",
    `Score : ${score}`,
    `Nom : ${donnees.nom}`,
    `Téléphone : ${donnees.telephone}`,
    donnees.email ? `Email : ${donnees.email}` : null,
    `Projet : ${donnees.typeProjet}`,
    donnees.budget ? `Budget : ${donnees.budget}` : null,
    donnees.financement ? `Financement : ${donnees.financement}` : null,
    donnees.delai ? `Délai : ${donnees.delai}` : null,
    donnees.profilClient ? `Profil : ${donnees.profilClient === "mre" ? "MRE" : "Résident au Maroc"}` : null,
    donnees.zones?.length ? `Zones : ${donnees.zones.join(", ")}` : null,
    `Source : ${donnees.source}`,
    donnees.titreBien ? `Bien concerné : ${donnees.titreBien}` : null,
    "",
    "Rappel scoring (calculé en base) : vente → chaud si < 3 mois ;",
    "achat/location → chaud si < 3 mois + financement cash/crédit accordé,",
    "tiède si délai ≤ 6 mois + financement renseigné, sinon froid.",
    "",
    "Traiter le lead : https://hoomy.ma/admin/leads",
  ].filter((l): l is string => l !== null);

  await envoyerEmail({
    sujet: `${donnees.score === "chaud" ? "🔥" : "🎯"} Nouveau lead ${donnees.score ?? ""} — ${donnees.typeProjet} (${donnees.source})`,
    texte: lignes.join("\n"),
  });
}

export async function notifierNouvelleActiviteLead(donnees: {
  type: "visite" | "message";
  titreBien: string;
  nomClient: string;
  emailClient: string;
  telephoneClient: string | null;
  message: string | null;
  dateSouhaitee: string | null;
}): Promise<void> {
  const sujetType = donnees.type === "visite" ? "Nouvelle demande de visite" : "Nouveau message client";

  const lignes = [
    `${sujetType} sur HOOMY.MA.`,
    "",
    `Bien : ${donnees.titreBien}`,
    `Client : ${donnees.nomClient}`,
    `Email : ${donnees.emailClient}`,
    donnees.telephoneClient ? `Téléphone : ${donnees.telephoneClient}` : null,
    donnees.dateSouhaitee ? `Date souhaitée : ${donnees.dateSouhaitee}` : null,
    donnees.message ? `Message : ${donnees.message}` : null,
  ].filter((ligne): ligne is string => ligne !== null);

  await envoyerEmail({
    sujet: `${donnees.type === "visite" ? "📅" : "✉️"} ${sujetType} — ${donnees.titreBien}`,
    texte: lignes.join("\n"),
  });
}
