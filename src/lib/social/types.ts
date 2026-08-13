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
 * URL publique du bien — réexportée depuis lib/biens/lienPublic.ts.
 *
 * ⚠️ Le cahier des charges indiquait https://hoomy.ma/biens/{slug} — cette
 * route N'EXISTE PAS dans l'application. Les pages de détail réelles sont
 * /acheter/{slug} et /louer/{slug} selon la transaction. Publier /biens/…
 * aurait envoyé tout le trafic Facebook et Instagram sur une page 404.
 *
 * La règle vivait ici en double avec celle du back-office. Cette duplication
 * est exactement ce qui a permis aux liens « Voir l'annonce » de partir en
 * chemin relatif : une seule définition désormais.
 */
export { urlPubliqueBien } from "@/lib/biens/lienPublic";

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

let jetonPageCache: string | null = null;

/**
 * Jeton de PAGE, obtenu à partir du jeton d'utilisateur système.
 *
 * Publier sur une Page exige d'agir « en tant que Page » : avec le seul jeton
 * système, Meta refuse par « (#200) Unpublished posts must be posted to a page
 * as the page itself. » Le jeton de Page s'obtient en lisant le champ
 * access_token de la Page — il ne change pas tant que les permissions de
 * l'utilisateur système restent en place, d'où la mise en cache par processus.
 */
export async function jetonPage(): Promise<string> {
  if (jetonPageCache) return jetonPageCache;

  const pageId = process.env.META_PAGE_ID;
  if (!pageId) throw new Error("META_PAGE_ID manquant.");

  const data = await appelGraph(
    `${baseGraph()}/${pageId}?fields=access_token&access_token=${encodeURIComponent(jetonMeta())}`
  );
  const jeton = data.access_token as string | undefined;
  if (!jeton) throw new Error("Meta n'a pas renvoyé de jeton de Page — vérifier les permissions de l'utilisateur système.");

  jetonPageCache = jeton;
  return jeton;
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
