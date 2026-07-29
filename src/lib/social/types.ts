import "server-only";

// Types partagés du module de publication sociale.
// Schéma réel de publications_sociales (vérifié en base, pas supposé) :
//   id, bien_id, reseau, type_pub, statut, legende, hashtags, medias,
//   programme_pour, publie_le, id_externe, erreur, tentatives, cree_le, maj_le

export type Reseau = "facebook" | "instagram";
export type TypePub = "feed" | "story";
export type StatutPub = "en_attente" | "en_cours" | "publie" | "echec" | "annule";

export type PublicationSociale = {
  id: string;
  bien_id: string;
  reseau: Reseau;
  type_pub: TypePub;
  statut: StatutPub;
  legende: string | null;
  hashtags: string[] | null;
  medias: string[] | null;
  programme_pour: string;
  publie_le: string | null;
  id_externe: string | null;
  erreur: string | null;
  tentatives: number;
  cree_le: string;
  maj_le: string;
};

/** Champs du bien réellement utilisés — aucun autre ne doit être inventé. */
export type BienSocial = {
  id: string;
  reference: string | null;
  slug: string | null;
  titre: string;
  type: string | null;
  transaction: string;
  ville: string;
  quartier: string | null;
  prix: number | null;
  surface: number | null;
  chambres: number | null;
  salles_bain: number | null;
  photos: string[] | null;
};

/**
 * URL publique du bien.
 *
 * ⚠️ Le cahier des charges indiquait https://hoomy.ma/biens/{slug} — cette
 * route N'EXISTE PAS dans l'application. Les pages de détail réelles sont
 * /acheter/{slug} et /louer/{slug} selon la transaction. Publier /biens/…
 * aurait envoyé tout le trafic Facebook et Instagram sur une page 404.
 */
export function urlPubliqueBien(bien: Pick<BienSocial, "slug" | "id" | "transaction">): string {
  const segment = bien.transaction === "location" ? "louer" : "acheter";
  return `https://hoomy.ma/${segment}/${bien.slug ?? bien.id}`;
}

/** Base de l'API Graph, version pilotée par META_API_VERSION. */
export function baseGraph(): string {
  const version = process.env.META_API_VERSION || "v21.0";
  return `https://graph.facebook.com/${version}`;
}

export function jetonMeta(): string {
  const t = process.env.META_SYSTEM_TOKEN;
  if (!t) throw new Error("META_SYSTEM_TOKEN manquant.");
  return t;
}

/** Journalisation systématique — sans elle, déboguer Graph API est impossible. */
export function journaliser(etape: string, details: unknown): void {
  console.log(`[social] ${etape} :`, typeof details === "string" ? details : JSON.stringify(details));
}

/** Pause entre appels Meta : les rafales déclenchent des erreurs transitoires. */
export function pause(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Appel Graph API journalisé (requête ET réponse), erreur explicite.
 * Toute erreur Meta remonte avec son message d'origine — indispensable au
 * diagnostic, les codes seuls ne disent rien.
 */
export async function appelGraph(
  url: string,
  init: RequestInit & { corpsJournal?: unknown } = {}
): Promise<Record<string, unknown>> {
  const { corpsJournal, ...options } = init;
  journaliser("→ requête", { url: url.replace(/access_token=[^&]+/, "access_token=***"), corps: corpsJournal });

  const reponse = await fetch(url, options);
  const brut = await reponse.text();
  let donnees: Record<string, unknown>;
  try {
    donnees = JSON.parse(brut) as Record<string, unknown>;
  } catch {
    journaliser("← réponse non-JSON", brut.slice(0, 500));
    throw new Error(`Réponse Meta illisible (HTTP ${reponse.status}) : ${brut.slice(0, 200)}`);
  }

  journaliser("← réponse", donnees);

  if (!reponse.ok || donnees.error) {
    const e = donnees.error as { message?: string; code?: number; error_subcode?: number } | undefined;
    throw new Error(
      `Meta ${reponse.status}${e?.code ? ` (code ${e.code}${e.error_subcode ? `/${e.error_subcode}` : ""})` : ""} : ${e?.message ?? brut.slice(0, 200)}`
    );
  }
  return donnees;
}
