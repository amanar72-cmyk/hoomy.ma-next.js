import { envoyerEmail } from "./envoyerEmail";

function formaterPrix(prix: number, transaction: string): string {
  const montant = prix.toLocaleString("fr-MA");
  return transaction === "location" ? `${montant} DH/mois` : `${montant} DH`;
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
