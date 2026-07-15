import nodemailer from "nodemailer";

// Transporteur SMTP créé une seule fois, à la demande — comme pour VAPID, un import
// de ce fichier ne doit jamais faire crasher une page si les variables sont absentes.
let transporteur: nodemailer.Transporter | null = null;

function obtenirTransporteur(): nodemailer.Transporter {
  if (transporteur) return transporteur;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD ?? process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error("Variables SMTP manquantes (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD)");
  }

  transporteur = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465, // 465 = SSL/TLS implicite, 587 = STARTTLS
    auth: { user, pass },
  });

  return transporteur;
}

export type EmailAEnvoyer = {
  sujet: string;
  texte: string;
  /** Destinataire — par défaut la boîte HOOMY (SMTP_USER, notifications admin) */
  destinataire?: string;
};

// Envoi best-effort : ne lève JAMAIS d'exception — une panne email ne doit jamais
// casser l'action métier (création de bien, demande de visite, etc.). Les erreurs
// sont loggées pour rester diagnosticables.
export async function envoyerEmail({ sujet, texte, destinataire }: EmailAEnvoyer): Promise<void> {
  try {
    const transport = obtenirTransporteur();
    const adresse = process.env.SMTP_USER as string;
    await transport.sendMail({
      from: `"HOOMY.MA" <${adresse}>`,
      to: destinataire ?? adresse,
      subject: sujet,
      text: texte,
    });
  } catch (err) {
    console.error("[email] Échec d'envoi :", err instanceof Error ? err.message : err);
  }
}
