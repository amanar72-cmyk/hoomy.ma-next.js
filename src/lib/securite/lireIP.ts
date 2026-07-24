// Extraction de l'IP client à des fins de RATE-LIMITING ANTI-SPAM uniquement —
// jamais une source de vérité pour des décisions de sécurité critiques
// (auth, autorisation).
//
// x-forwarded-for est une liste où CHAQUE hop ajoute une entrée. Le premier
// maillon est fourni par le client lui-même et donc falsifiable à volonté :
// un attaquant qui change cette valeur à chaque requête contourne entièrement
// un rate-limit basé sur `.split(",")[0]` (vérifié empiriquement — 7/7
// requêtes passent avec IP usurpée, contre blocage correct dès la 6e sans
// usurpation). On prend le DERNIER maillon : c'est celui ajouté par le
// reverse proxy Hostinger, au plus près du process Node, donc le seul qu'un
// client distant ne peut pas falsifier — à condition que le proxy AJOUTE
// (et ne remplace pas aveuglément par une valeur cliente) l'IP réelle, ce qui
// est le comportement standard de nginx (`$proxy_add_x_forwarded_for`).
//
// Prend un Headers brut (commun à Request, NextRequest et next/headers()) —
// utilisable indifféremment depuis une Route Handler ou une Server Action.
export function lireIP(headers: Headers): string {
  const brut = headers.get("x-forwarded-for");
  if (!brut) return "inconnue";
  const maillons = brut.split(",").map((m) => m.trim()).filter(Boolean);
  return maillons[maillons.length - 1] || "inconnue";
}
