// Journalisation des tentatives de connexion.
// Le login Supabase se fait côté navigateur → pour capturer l'IP réelle et le
// user-agent, on route chaque tentative vers notre serveur (/api/connexion-log),
// qui insère en base via le client service_role. Fire-and-forget : ne bloque et
// n'interrompt JAMAIS le parcours de connexion.

export type MethodeConnexion = "mot_de_passe" | "google" | "pro";
export type ResultatConnexion = "succes" | "echec";

export type PayloadConnexionLog = {
  email?: string | null;
  methode: MethodeConnexion;
  resultat: ResultatConnexion;
  motif?: string | null;
};

export async function journaliserConnexion(payload: PayloadConnexionLog): Promise<void> {
  try {
    await fetch("/api/connexion-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true, // survit à une navigation immédiate (redirection après login)
    });
  } catch {
    // jamais bloquant
  }
}
