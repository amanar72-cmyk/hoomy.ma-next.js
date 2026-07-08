// Extraction basique navigateur + OS depuis un user-agent (zéro dépendance).
// Suffisant pour l'affichage admin des tentatives de connexion.

export function parseUserAgent(ua: string | null): { navigateur: string; os: string } {
  if (!ua) return { navigateur: "Inconnu", os: "Inconnu" };

  let navigateur = "Inconnu";
  if (/Edg\//.test(ua)) navigateur = "Edge";
  else if (/OPR\/|Opera/.test(ua)) navigateur = "Opera";
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) navigateur = "Chrome";
  else if (/Firefox\//.test(ua)) navigateur = "Firefox";
  else if (/Safari\//.test(ua)) navigateur = "Safari";

  let os = "Inconnu";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Mac OS X|Macintosh/.test(ua)) os = "macOS";
  else if (/Linux/.test(ua)) os = "Linux";

  return { navigateur, os };
}
