// Script de test SMTP — lance avec :
//   SMTP_HOST=... SMTP_PORT=465 SMTP_USER=contact@hoomy.ma SMTP_PASS=... node test-email.mjs
// OU, si les vars sont dans .env.local :
//   node --env-file=.env.local test-email.mjs
//
// Ce script N'utilise PAS envoyerEmail.ts (qui avale les erreurs).
// Il laisse nodemailer propager l'erreur complète pour diagnostiquer.

import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT ?? "465");
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

console.log("── Variables SMTP chargées ──────────────────────");
console.log("SMTP_HOST :", host  ?? "⚠️  MANQUANTE");
console.log("SMTP_PORT :", port);
console.log("SMTP_USER :", user  ?? "⚠️  MANQUANTE");
console.log("SMTP_PASS :", pass  ? "****" + pass.slice(-3) : "⚠️  MANQUANTE");
console.log("secure    :", port === 465, "(true = SSL implicite, false = STARTTLS)");
console.log("────────────────────────────────────────────────\n");

if (!host || !user || !pass) {
  console.error("❌ Variables manquantes. Ajoutez-les dans .env.local puis relancez avec :");
  console.error("   node --env-file=.env.local test-email.mjs");
  process.exit(1);
}

const transport = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
  // Désactivé temporairement pour contourner les certs auto-signés (Titan/Hostinger)
  // tls: { rejectUnauthorized: false },
});

console.log("Vérification SMTP (verify)…");
try {
  await transport.verify();
  console.log("✅ Connexion SMTP OK — les identifiants sont acceptés.\n");
} catch (err) {
  console.error("❌ verify() échoué :", err.message);
  console.error("   Code :", err.code);
  console.error("   Stack:", err.stack);
  console.log("\n→ Si l'erreur contient \"CERT\" ou \"TLS\" : décommentez la ligne tls.rejectUnauthorized dans le script.");
  console.log("→ Si l'erreur contient \"Invalid login\" : vérifiez SMTP_USER / SMTP_PASS.");
  console.log("→ Si l'erreur contient \"ECONNREFUSED\" : vérifiez SMTP_HOST et SMTP_PORT.");
  process.exit(1);
}

console.log("Envoi d'un email test…");
const info = await transport.sendMail({
  from: `"HOOMY.MA Test" <${user}>`,
  to: user,
  subject: "🧪 Test SMTP HOOMY.MA",
  text: "Si vous recevez cet email, la config SMTP fonctionne correctement.",
});

console.log("✅ Email envoyé !");
console.log("   messageId :", info.messageId);
console.log("   response  :", info.response);
