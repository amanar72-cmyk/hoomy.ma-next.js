// Tracking des événements sur les biens — fire and forget
// Ne doit JAMAIS bloquer la navigation ni lancer d'exception visible

import { createClient } from "@/lib/supabase/client";
import { obtenirSessionId } from "./session";

export type TypeEvenement = "vue" | "clic" | "contact";

// Anti-doublon en mémoire par session : evite de compter 2x la même vue
// dans les 30 min. Réinitialisé à chaque rechargement de page.
const dernieres = new Map<string, number>();
const DELAI_VUE_MS = 30 * 60 * 1000;

export async function trackEvenement(
  bienId: string,
  type: TypeEvenement
): Promise<void> {
  try {
    const sessionId = obtenirSessionId();
    if (!sessionId) return;

    // Anti-doublon : ignorer si même bien déjà vu dans cette session < 30 min
    if (type === "vue") {
      const cle = `${sessionId}-${bienId}`;
      const derniere = dernieres.get(cle);
      if (derniere && Date.now() - derniere < DELAI_VUE_MS) return;
      dernieres.set(cle, Date.now());
    }

    const supabase = createClient();

    // Récupérer l'utilisateur connecté depuis le cache local (pas de requête réseau)
    let visiteurId: string | null = null;
    try {
      const { data } = await supabase.auth.getSession();
      visiteurId = data.session?.user?.id ?? null;
    } catch {
      // Auth indisponible — on continue sans visiteur_id
    }

    // Insérer l'événement (sans await pour ne pas bloquer)
    void supabase.from("evenements_bien").insert({
      bien_id: bienId,
      type_evenement: type,
      visiteur_id: visiteurId,
      session_id: sessionId,
    });

    // Incrémenter le compteur rapide pour les vues
    if (type === "vue") {
      void supabase.rpc("incrementer_vue", { p_bien_id: bienId });
    }
  } catch {
    // Silencieux — le tracking ne doit jamais casser la page
  }
}
