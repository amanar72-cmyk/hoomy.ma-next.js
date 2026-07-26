// Message WhatsApp pré-rempli pour recontacter un lead — source UNIQUE,
// partagée par /admin/leads et /pro/leads (les deux avaient jusqu'ici leur
// propre formulation codée en dur, qui divergeait).
//
// Le message reprend ce que le prospect a réellement écrit : c'est ce qui
// distingue une relance personnalisée d'un envoi générique.

/** Longueur max du message cité — au-delà, WhatsApp devient illisible. */
const CITATION_MAX = 280;

type Options = {
  nom: string;
  /** Ce que le prospect a écrit dans sa demande (colonne leads.message). */
  message?: string | null;
  /** Rappel programmé, s'il y en a un (colonne leads.date_rappel). */
  dateRappel?: string | null;
  /** Origine du lead (colonne leads.source) — conditionne la 1re phrase. */
  source?: string | null;
  /** Titre du bien concerné, quand le lead vient d'une fiche (leads.bien_id). */
  titreBien?: string | null;
};

/**
 * Rappelle au prospect D'OÙ vient sa demande. Écrire « reçue sur notre site »
 * à quelqu'un venu d'un formulaire Facebook le ferait douter d'un spam : la
 * quasi-totalité des leads arrive aujourd'hui de Meta Ads.
 */
function origine(source: string | null | undefined, titreBien: string | null | undefined): string {
  switch (source) {
    case "meta_ads":
      return "je fais suite à votre demande via notre annonce Facebook.";
    case "whatsapp":
      return "je fais suite à notre échange sur WhatsApp.";
    case "estimation":
      return "je fais suite à votre demande d'estimation.";
    case "fiche_bien":
      return titreBien?.trim()
        ? `je fais suite à votre demande concernant « ${tronquer(titreBien, 90)} ».`
        : "je fais suite à votre demande concernant un bien de notre catalogue.";
    default:
      return "je fais suite à votre demande reçue sur notre site.";
  }
}

/** Prénom seul si le nom complet en contient un — plus naturel qu'un nom entier. */
function prenomOuNom(nomComplet: string): string {
  const propre = nomComplet.trim().replace(/\s+/g, " ");
  if (!propre || propre === "(sans nom)") return "";
  return propre.split(" ")[0];
}

function formaterMoment(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("fr-MA", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
}

/** Coupe proprement sur un mot plutôt qu'en plein milieu. */
function tronquer(texte: string, max: number): string {
  const t = texte.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  const coupe = t.slice(0, max);
  const dernierEspace = coupe.lastIndexOf(" ");
  return (dernierEspace > max * 0.6 ? coupe.slice(0, dernierEspace) : coupe) + "…";
}

/**
 * Construit le message de relance. Chaque partie est optionnelle : un lead
 * sans message ou sans rappel produit quand même un texte cohérent.
 */
export function construireMessageWhatsAppLead({
  nom, message, dateRappel, source, titreBien,
}: Options): string {
  const prenom = prenomOuNom(nom);
  const lignes: string[] = [];

  lignes.push(prenom ? `Bonjour ${prenom},` : "Bonjour,");
  lignes.push("");

  // Un rappel programmé prime : c'est l'accroche la plus concrète, et elle
  // reste vraie quelle que soit l'origine de la demande.
  const moment = dateRappel ? formaterMoment(dateRappel) : null;
  lignes.push(
    moment
      ? `Je suis conseiller chez HOOMY.MA et je fais suite à votre demande de rappel prévue ${moment}.`
      : `Je suis conseiller chez HOOMY.MA et ${origine(source, titreBien)}`
  );

  const citation = message?.trim() ? tronquer(message, CITATION_MAX) : null;
  if (citation) {
    lignes.push("");
    lignes.push(`Vous nous avez indiqué : « ${citation} »`);
  }

  lignes.push("");
  lignes.push("Seriez-vous disponible pour en discuter ? Dites-moi le moment qui vous arrange et je vous appelle.");

  return lignes.join("\n");
}

/** Lien wa.me prêt à l'emploi (numéro déjà au format 2126XXXXXXXX, sans +). */
export function lienWhatsAppLead(numeroWA: string, options: Options): string {
  return `https://wa.me/${numeroWA}?text=${encodeURIComponent(construireMessageWhatsAppLead(options))}`;
}
