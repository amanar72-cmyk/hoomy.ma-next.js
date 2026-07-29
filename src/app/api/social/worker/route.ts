import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { composerStory } from "@/lib/social/visuel";
import { genererLegende, composerTexteFinal } from "@/lib/social/redacteur";
import * as facebook from "@/lib/social/facebook";
import * as instagram from "@/lib/social/instagram";
import { journaliser, pause, type BienSocial, type PublicationSociale } from "@/lib/social/types";

// Worker de publication sociale — appelé par un cron externe.
//
// Aucun appel Meta n'est fait dans le chemin de validation d'un bien : le
// trigger Postgres met simplement 4 lignes en file, tout le travail lourd
// (composition, IA, réseaux) se passe ici. Une validation de bien reste donc
// instantanée même si Meta est lent ou en panne.

export const runtime = "nodejs";
export const maxDuration = 300;

const LOT = 5;
const NB_VISUELS_STORY = 3;
const NB_PHOTOS_FEED_MAX = 10;
const TENTATIVES_MAX = 3;
const REPORT_MINUTES = 15;
const BUCKET = "medias-social";

function secretValide(fourni: string | null, attendu: string): boolean {
  if (!fourni) return false;
  const a = Buffer.from(fourni);
  const b = Buffer.from(attendu);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Échec : report de 15 min, ou abandon définitif à la 3ᵉ tentative. */
async function marquerEchec(
  admin: ReturnType<typeof createAdminClient>,
  pub: PublicationSociale,
  message: string
): Promise<void> {
  const tentatives = (pub.tentatives ?? 0) + 1;
  const abandon = tentatives >= TENTATIVES_MAX;
  journaliser(`échec ${pub.id} (tentative ${tentatives}/${TENTATIVES_MAX})`, message);

  await admin
    .from("publications_sociales")
    .update({
      statut: abandon ? "echec" : "en_attente",
      tentatives,
      erreur: message.slice(0, 1000),
      programme_pour: abandon
        ? pub.programme_pour
        : new Date(Date.now() + REPORT_MINUTES * 60_000).toISOString(),
    })
    .eq("id", pub.id);
}

/** Compose les 3 visuels de story et les dépose dans le bucket public. */
async function preparerVisuelsStory(
  admin: ReturnType<typeof createAdminClient>,
  bien: BienSocial
): Promise<string[]> {
  const sources = (bien.photos ?? []).slice(0, NB_VISUELS_STORY);
  if (sources.length === 0) throw new Error("Le bien n'a aucune photo — story impossible.");

  const urls: string[] = [];
  for (let i = 0; i < sources.length; i++) {
    const reponse = await fetch(sources[i]);
    if (!reponse.ok) throw new Error(`Photo ${i + 1} inaccessible (HTTP ${reponse.status}).`);
    const jpeg = await composerStory(Buffer.from(await reponse.arrayBuffer()), bien);

    const chemin = `social/${bien.id}/story-${i + 1}-${Date.now()}.jpg`;
    const { error } = await admin.storage
      .from(BUCKET)
      .upload(chemin, jpeg, { contentType: "image/jpeg", upsert: true });
    if (error) throw new Error(`Dépôt du visuel ${i + 1} échoué : ${error.message}`);

    const { data } = admin.storage.from(BUCKET).getPublicUrl(chemin);
    urls.push(data.publicUrl);
  }
  journaliser("visuels story prêts", urls);
  return urls;
}

async function traiterPublication(
  admin: ReturnType<typeof createAdminClient>,
  pub: PublicationSociale
): Promise<"publie" | "echec"> {
  try {
    const { data: bienBrut, error: eBien } = await admin
      .from("biens")
      .select("id, reference, slug, titre, type, transaction, ville, quartier, prix, surface, chambres, salles_bain, photos")
      .eq("id", pub.bien_id)
      .maybeSingle();
    if (eBien || !bienBrut) throw new Error("Bien introuvable.");
    const bien = bienBrut as BienSocial;

    const medias =
      pub.type_pub === "story"
        ? await preparerVisuelsStory(admin, bien)
        : (bien.photos ?? []).slice(0, NB_PHOTOS_FEED_MAX);

    if (medias.length === 0) throw new Error("Aucun média disponible pour cette publication.");

    const legende = await genererLegende(bien, pub.reseau);
    const texte = composerTexteFinal(legende);

    const reseau = pub.reseau === "facebook" ? facebook : instagram;
    const idExterne =
      pub.type_pub === "story"
        ? await reseau.publierStory({ medias })
        : await reseau.publierFeed({ medias, message: texte });

    await admin
      .from("publications_sociales")
      .update({
        statut: "publie",
        publie_le: new Date().toISOString(),
        id_externe: idExterne,
        legende: legende.texte,
        hashtags: legende.hashtags.length ? legende.hashtags : null,
        medias,
        erreur: null,
      })
      .eq("id", pub.id);

    journaliser(`publié ${pub.reseau}/${pub.type_pub}`, idExterne);
    return "publie";
  } catch (e) {
    await marquerEchec(admin, pub, e instanceof Error ? e.message : String(e));
    return "echec";
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.SOCIAL_CRON_SECRET;
  if (!secret) {
    console.error("[social] SOCIAL_CRON_SECRET non configurée — worker désactivé.");
    return NextResponse.json({ erreur: "Worker non configuré." }, { status: 503 });
  }
  if (!secretValide(req.headers.get("x-cron-secret"), secret)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }

  const admin = createAdminClient();

  // Réservation du lot : passage immédiat en 'en_cours' pour qu'une exécution
  // concurrente du cron ne reprenne pas les mêmes lignes. PostgREST n'expose
  // pas FOR UPDATE SKIP LOCKED ; la réservation par UPDATE ciblé joue le même
  // rôle ici (un seul worker, lignes marquées avant tout traitement long).
  const { data: candidates, error } = await admin
    .from("publications_sociales")
    .select("*")
    .eq("statut", "en_attente")
    .lte("programme_pour", new Date().toISOString())
    .order("programme_pour", { ascending: true })
    .limit(LOT);

  if (error) {
    console.error("[social] lecture de la file échouée :", error);
    return NextResponse.json({ erreur: error.message }, { status: 500 });
  }

  const file = (candidates ?? []) as PublicationSociale[];
  if (file.length === 0) return NextResponse.json({ ok: true, traitees: 0 });

  const reserves: PublicationSociale[] = [];
  for (const pub of file) {
    const { data } = await admin
      .from("publications_sociales")
      .update({ statut: "en_cours" })
      .eq("id", pub.id)
      .eq("statut", "en_attente") // garde anti-concurrence
      .select("id")
      .maybeSingle();
    if (data) reserves.push(pub);
  }

  journaliser("lot réservé", reserves.map((p) => `${p.reseau}/${p.type_pub}`));

  let publiees = 0;
  let echecs = 0;
  for (const pub of reserves) {
    const issue = await traiterPublication(admin, pub);
    if (issue === "publie") publiees++;
    else echecs++;
    await pause(4000); // respiration entre deux publications
  }

  return NextResponse.json({ ok: true, traitees: reserves.length, publiees, echecs });
}
