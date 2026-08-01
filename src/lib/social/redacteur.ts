import "server-only";
import { journaliser, urlPubliqueBien, type BienSocial, type Reseau } from "./types";

// Rédaction des légendes via OpenAI (gpt-4o), réponse JSON stricte.
//
// RÈGLE ABSOLUE : seuls les champs RÉELS de la ligne `biens` sont transmis au
// modèle, et le prompt lui interdit d'en inventer d'autres. Un prix ou une
// surface fantaisiste sur une publication publique est un problème juridique,
// pas un défaut d'affichage. Les champs absents sont omis du contexte plutôt
// que envoyés vides, pour ne pas inviter le modèle à les combler.

export type Legende = { texte: string; hashtags: string[] };

const MODELE = "gpt-4o";

function contexteBien(bien: BienSocial): string {
  const lignes: string[] = [
    `Titre : ${bien.titre}`,
    `Transaction : ${bien.transaction === "location" ? "location" : "vente"}`,
    `Ville : ${bien.ville}`,
  ];
  if (bien.type) lignes.push(`Type : ${bien.type}`);
  if (bien.quartier) lignes.push(`Quartier : ${bien.quartier}`);
  if (bien.prix) {
    const p = Math.round(bien.prix).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    lignes.push(`Prix : ${p} DH${bien.transaction === "location" ? " par mois" : ""}`);
  }
  if (bien.surface) lignes.push(`Surface : ${bien.surface} m²`);
  if (bien.chambres) lignes.push(`Chambres : ${bien.chambres}`);
  if (bien.salles_bain) lignes.push(`Salles de bain : ${bien.salles_bain}`);
  if (bien.reference) lignes.push(`Référence : ${bien.reference}`);
  lignes.push(`Lien : ${urlPubliqueBien(bien)}`);
  return lignes.join("\n");
}

function consigne(reseau: Reseau, bien: BienSocial): string {
  const commun = `Tu es EXPERT en marketing immobilier premium et tu rédiges pour HOOMY.MA (agence marocaine haut de gamme).

Objectif : une annonce qui DONNE ENVIE et fait cliquer.
- Ouvre par une accroche forte qui met en valeur l'atout n°1 du bien.
- Fais PROJETER le lecteur (« imaginez-vous… », « idéal pour… »).
- Transforme chaque caractéristique fournie en BÉNÉFICE concret (ex. « grande surface » → « des espaces de vie généreux »).
- Crée un sentiment d'opportunité et termine par un appel à l'action clair (visiter, en savoir plus).
- Ton premium, chaleureux, jamais racoleur ni superlatif creux.

INTERDIT ABSOLU : n'utilise QUE les informations listées ci-dessous. N'invente
jamais un prix, une surface, un nombre de pièces, un équipement, un étage, une
proximité (plage, école, commerce) ni un argument de vente non fourni. Si une
information manque, ne la mentionne pas. Écris en français.`;

  if (reseau === "facebook") {
    return `${commun}

Format Facebook : 3 à 4 lignes, ton chaleureux et professionnel, emojis avec
modération (2 à 4 maximum). Termine impérativement par le lien puis la
référence. Le champ "hashtags" doit rester un tableau vide.`;
  }

  return `${commun}

Format Instagram : la PREMIÈRE ligne est une accroche de moins de 125
caractères (elle seule est visible avant « plus »). Ensuite les détails en
quelques lignes courtes. Ne mets pas de lien cliquable (Instagram ne les
active pas) : invite à consulter le lien en bio.
Le champ "hashtags" doit contenir 8 à 12 hashtags SANS le caractère #, dont au
moins 4 locaux liés à ${bien.ville}${bien.quartier ? ` et ${bien.quartier}` : ""}.`;
}

/**
 * Légende de repli — utilisée si l'API est indisponible ou renvoie une réponse
 * inexploitable. Uniquement des données réelles : mieux vaut une légende
 * sobre qu'une publication manquée ou inventée.
 */
function legendeRepli(bien: BienSocial, reseau: Reseau): Legende {
  const details = [
    bien.surface ? `${bien.surface} m²` : null,
    bien.chambres ? `${bien.chambres} chambre${bien.chambres > 1 ? "s" : ""}` : null,
  ].filter(Boolean).join(" · ");
  const prix = bien.prix
    ? `${Math.round(bien.prix).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} DH${bien.transaction === "location" ? "/mois" : ""}`
    : null;

  const lignes = [
    bien.titre,
    [bien.quartier, bien.ville].filter(Boolean).join(", "),
    details || null,
    prix,
  ].filter(Boolean) as string[];

  if (reseau === "facebook") {
    lignes.push(urlPubliqueBien(bien));
    if (bien.reference) lignes.push(`Réf. ${bien.reference}`);
    return { texte: lignes.join("\n"), hashtags: [] };
  }

  lignes.push("Lien en bio");
  return {
    texte: lignes.join("\n"),
    hashtags: ["immobilier", "maroc", bien.ville.toLowerCase().replace(/\s/g, ""), "hoomy"],
  };
}

export async function genererLegende(bien: BienSocial, reseau: Reseau): Promise<Legende> {
  const cle = process.env.OPENAI_API_KEY;
  if (!cle) {
    journaliser("légende", "OPENAI_API_KEY absente → repli sur légende factuelle");
    return legendeRepli(bien, reseau);
  }

  try {
    const reponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cle}` },
      body: JSON.stringify({
        model: MODELE,
        response_format: { type: "json_object" },
        temperature: 0.7,
        messages: [
          { role: "system", content: `${consigne(reseau, bien)}

Réponds UNIQUEMENT par un objet JSON : {"texte": string, "hashtags": string[]}` },
          { role: "user", content: contexteBien(bien) },
        ],
      }),
    });

    if (!reponse.ok) {
      journaliser("légende — échec HTTP", `${reponse.status} ${(await reponse.text()).slice(0, 200)}`);
      return legendeRepli(bien, reseau);
    }

    const data = await reponse.json();
    const contenu = data?.choices?.[0]?.message?.content;
    if (typeof contenu !== "string") return legendeRepli(bien, reseau);

    const parse = JSON.parse(contenu) as Partial<Legende>;
    const texte = typeof parse.texte === "string" ? parse.texte.trim() : "";
    if (!texte) return legendeRepli(bien, reseau);

    const hashtags = Array.isArray(parse.hashtags)
      ? parse.hashtags
          .filter((h): h is string => typeof h === "string")
          .map((h) => h.replace(/^#/, "").trim())
          .filter(Boolean)
          .slice(0, 12)
      : [];

    journaliser("légende générée", { reseau, longueur: texte.length, hashtags: hashtags.length });
    return { texte, hashtags };
  } catch (e) {
    journaliser("légende — exception", e instanceof Error ? e.message : String(e));
    return legendeRepli(bien, reseau);
  }
}

/** Texte final envoyé au réseau : légende + hashtags (Instagram uniquement). */
export function composerTexteFinal(legende: Legende): string {
  if (legende.hashtags.length === 0) return legende.texte;
  return `${legende.texte}\n\n${legende.hashtags.map((h) => `#${h}`).join(" ")}`;
}
