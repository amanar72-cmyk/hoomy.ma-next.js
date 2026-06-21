// Identifiant de session visiteur — stocké dans un cookie (pas localStorage)
// Durée : 24h renouvelable. Permet de dédupliquer les vues côté client.

const NOM_COOKIE = "hoomy_sid";
const DUREE_MS = 24 * 60 * 60 * 1000;

function lireCookie(nom: string): string | null {
  if (typeof document === "undefined") return null;
  const trouvé = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${nom}=`));
  return trouvé ? trouvé.split("=")[1] : null;
}

function ecrireCookie(nom: string, valeur: string, dureeMs: number): void {
  const expiry = new Date(Date.now() + dureeMs).toUTCString();
  document.cookie = `${nom}=${valeur}; expires=${expiry}; path=/; SameSite=Lax`;
}

export function obtenirSessionId(): string {
  if (typeof document === "undefined") return "";
  const existant = lireCookie(NOM_COOKIE);
  if (existant) return existant;
  const nouvelId = crypto.randomUUID();
  ecrireCookie(NOM_COOKIE, nouvelId, DUREE_MS);
  return nouvelId;
}
