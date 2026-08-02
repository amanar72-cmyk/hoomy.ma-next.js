// Extraction de l'IP client à des fins de RATE-LIMITING ANTI-SPAM uniquement —
// jamais une source de vérité pour des décisions de sécurité critiques
// (auth, autorisation).
//
// Les en-têtes d'IP sont contrôlables par le client tant que le reverse proxy
// ne les supprime pas avant de les réécrire. On préfère donc X-Real-IP (nginx)
// et on n'accepte X-Forwarded-For que si le déploiement l'autorise explicitement.
// Sans cette variable, les clients sans X-Real-IP partagent la clé "inconnue" :
// c'est moins permissif, mais évite qu'un attaquant contourne la limite avec une
// simple valeur X-Forwarded-For inventée.
//
// Prend un Headers brut (commun à Request, NextRequest et next/headers()) —
// utilisable indifféremment depuis une Route Handler ou une Server Action.
export function lireIP(headers: Headers): string {
  const ipReelle = headers.get("x-real-ip")?.trim();
  if (ipReelle) return ipReelle;

  if (process.env.TRUST_PROXY_X_FORWARDED_FOR !== "true") return "inconnue";

  const brut = headers.get("x-forwarded-for");
  if (!brut) return "inconnue";
  const maillons = brut.split(",").map((m) => m.trim()).filter(Boolean);
  return maillons[maillons.length - 1] || "inconnue";
}
