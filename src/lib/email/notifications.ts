import { envoyerEmail } from "./envoyerEmail";
import { formaterPrix } from "@/lib/format";


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
