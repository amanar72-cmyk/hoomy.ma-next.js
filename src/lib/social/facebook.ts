import "server-only";
import { appelGraph, baseGraph, jetonPage, journaliser, pause } from "./types";

// Publication sur la Page Facebook.
//
// ⚠️ Une photo déjà rattachée à un post publié ne peut PAS servir de story :
// Meta refuse la réutilisation d'un media_id déjà consommé. Chaque usage exige
// donc son propre upload — publierStory ré-uploade systématiquement, même si
// la même image vient d'être postée en feed.

const ATTENTE_ENTRE_APPELS = 4000;

function pageId(): string {
  const id = process.env.META_PAGE_ID;
  if (!id) throw new Error("META_PAGE_ID manquant.");
  return id;
}

/** Upload non publié → renvoie le photo_id réutilisable dans un post. */
async function televerserPhoto(url: string): Promise<string> {
  const corps = new URLSearchParams({
    url,
    published: "false",
    access_token: await jetonPage(),
  });
  const data = await appelGraph(`${baseGraph()}/${pageId()}/photos`, {
    method: "POST",
    body: corps,
    corpsJournal: { url, published: false },
  });
  const id = data.id as string | undefined;
  if (!id) throw new Error("Facebook n'a pas renvoyé de photo_id.");
  return id;
}

/**
 * Post feed multi-photos : chaque image est téléversée non publiée, puis
 * rattachée au post via attached_media.
 */
export async function publierFeed(params: {
  medias: string[];
  message: string;
}): Promise<string> {
  const { medias, message } = params;
  if (medias.length === 0) throw new Error("Aucune photo à publier.");

  const photoIds: string[] = [];
  for (const url of medias.slice(0, 10)) {
    photoIds.push(await televerserPhoto(url));
    await pause(ATTENTE_ENTRE_APPELS);
  }

  const corps = new URLSearchParams({ message, access_token: await jetonPage() });
  photoIds.forEach((id, i) => {
    corps.append(`attached_media[${i}]`, JSON.stringify({ media_fbid: id }));
  });

  const data = await appelGraph(`${baseGraph()}/${pageId()}/feed`, {
    method: "POST",
    body: corps,
    corpsJournal: { message: message.slice(0, 120), photos: photoIds.length },
  });

  const id = data.id as string | undefined;
  if (!id) throw new Error("Facebook n'a pas renvoyé d'identifiant de publication.");
  journaliser("facebook feed publié", id);
  return id;
}

/**
 * Stories : une par visuel. Chaque visuel est téléversé POUR CETTE story —
 * jamais un photo_id déjà utilisé ailleurs (voir avertissement en tête).
 * Renvoie l'identifiant de la première story créée.
 */
export async function publierStory(params: { medias: string[] }): Promise<string> {
  const { medias } = params;
  if (medias.length === 0) throw new Error("Aucun visuel de story à publier.");

  const identifiants: string[] = [];
  for (const url of medias) {
    const photoId = await televerserPhoto(url);
    await pause(ATTENTE_ENTRE_APPELS);

    const data = await appelGraph(
      `${baseGraph()}/${pageId()}/photo_stories?photo_id=${encodeURIComponent(photoId)}&access_token=${encodeURIComponent(await jetonPage())}`,
      { method: "POST", corpsJournal: { photo_id: photoId } }
    );
    identifiants.push((data.post_id ?? data.id) as string);
    await pause(ATTENTE_ENTRE_APPELS);
  }

  journaliser("facebook stories publiées", identifiants);
  return identifiants[0];
}
