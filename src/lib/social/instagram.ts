import "server-only";
import { appelGraph, baseGraph, jetonMeta, journaliser, pause } from "./types";

// Publication Instagram (compte professionnel via l'API Graph).
//
// ⚠️ IMPÉRATIF : Instagram traite chaque conteneur de façon ASYNCHRONE. Appeler
// media_publish avant que status_code vaille FINISHED échoue silencieusement —
// l'API répond 200 mais rien n'est publié. Tout conteneur est donc attendu par
// scrutation avant publication.
//
// Limite plateforme : 100 publications API par tranche de 24 h. Le quota
// restant est journalisé après chaque publication pour pouvoir l'anticiper.

const ATTENTE_ENTRE_APPELS = 4000;
const INTERVALLE_SCRUTATION = 5000;
const DELAI_MAX_SCRUTATION = 5 * 60 * 1000;

function igUserId(): string {
  const id = process.env.META_IG_USER_ID;
  if (!id) throw new Error("META_IG_USER_ID manquant.");
  return id;
}

/** Attend qu'un conteneur soit FINISHED. Lève une erreur explicite sinon. */
async function attendreConteneurPret(conteneurId: string): Promise<void> {
  const debut = Date.now();
  while (Date.now() - debut < DELAI_MAX_SCRUTATION) {
    const data = await appelGraph(
      `${baseGraph()}/${conteneurId}?fields=status_code,status&access_token=${encodeURIComponent(jetonMeta())}`
    );
    const statut = data.status_code as string | undefined;

    if (statut === "FINISHED") return;
    if (statut === "ERROR" || statut === "EXPIRED") {
      throw new Error(`Conteneur Instagram ${conteneurId} en échec (${statut}) : ${data.status ?? "sans détail"}`);
    }
    await pause(INTERVALLE_SCRUTATION);
  }
  throw new Error(`Conteneur Instagram ${conteneurId} toujours pas prêt après 5 minutes.`);
}

async function creerConteneur(parametres: Record<string, string>): Promise<string> {
  const corps = new URLSearchParams({ ...parametres, access_token: jetonMeta() });
  const data = await appelGraph(`${baseGraph()}/${igUserId()}/media`, {
    method: "POST",
    body: corps,
    corpsJournal: parametres,
  });
  const id = data.id as string | undefined;
  if (!id) throw new Error("Instagram n'a pas renvoyé d'identifiant de conteneur.");
  return id;
}

async function publierConteneur(conteneurId: string): Promise<string> {
  await attendreConteneurPret(conteneurId);
  const corps = new URLSearchParams({ creation_id: conteneurId, access_token: jetonMeta() });
  const data = await appelGraph(`${baseGraph()}/${igUserId()}/media_publish`, {
    method: "POST",
    body: corps,
    corpsJournal: { creation_id: conteneurId },
  });
  const id = data.id as string | undefined;
  if (!id) throw new Error("Instagram n'a pas renvoyé d'identifiant de publication.");
  await journaliserQuota();
  return id;
}

/** Quota restant sur 24 h — journalisé pour anticiper le plafond de 100. */
async function journaliserQuota(): Promise<void> {
  try {
    const data = await appelGraph(
      `${baseGraph()}/${igUserId()}/content_publishing_limit?fields=quota_usage,config&access_token=${encodeURIComponent(jetonMeta())}`
    );
    const usage = (data.data as Array<{ quota_usage?: number }> | undefined)?.[0]?.quota_usage;
    if (usage !== undefined) journaliser("instagram quota 24h", `${usage}/100 publications utilisées`);
  } catch {
    // Le quota est une information de confort : son échec ne doit jamais
    // faire retomber une publication réussie en erreur.
  }
}

/**
 * Feed : carrousel. Un conteneur enfant par image (is_carousel_item), puis un
 * conteneur CAROUSEL qui les rassemble avec la légende.
 * Une seule image → publication simple (Instagram refuse un carrousel de 1).
 */
export async function publierFeed(params: { medias: string[]; message: string }): Promise<string> {
  const { message } = params;
  const medias = params.medias.slice(0, 10);
  if (medias.length === 0) throw new Error("Aucune photo à publier.");

  if (medias.length === 1) {
    const unique = await creerConteneur({ image_url: medias[0], caption: message });
    await pause(ATTENTE_ENTRE_APPELS);
    return publierConteneur(unique);
  }

  const enfants: string[] = [];
  for (const url of medias) {
    enfants.push(await creerConteneur({ image_url: url, is_carousel_item: "true" }));
    await pause(ATTENTE_ENTRE_APPELS);
  }

  // Chaque enfant doit être prêt avant d'être référencé par le carrousel.
  for (const id of enfants) await attendreConteneurPret(id);

  const carrousel = await creerConteneur({
    media_type: "CAROUSEL",
    children: enfants.join(","),
    caption: message,
  });
  await pause(ATTENTE_ENTRE_APPELS);

  const id = await publierConteneur(carrousel);
  journaliser("instagram carrousel publié", id);
  return id;
}

/** Stories : un conteneur STORIES par visuel. */
export async function publierStory(params: { medias: string[] }): Promise<string> {
  const { medias } = params;
  if (medias.length === 0) throw new Error("Aucun visuel de story à publier.");

  const identifiants: string[] = [];
  for (const url of medias) {
    const conteneur = await creerConteneur({ media_type: "STORIES", image_url: url });
    await pause(ATTENTE_ENTRE_APPELS);
    identifiants.push(await publierConteneur(conteneur));
    await pause(ATTENTE_ENTRE_APPELS);
  }

  journaliser("instagram stories publiées", identifiants);
  return identifiants[0];
}
