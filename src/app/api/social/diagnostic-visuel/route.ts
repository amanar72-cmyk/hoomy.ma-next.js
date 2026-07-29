import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { composerStory } from "@/lib/social/visuel";
import type { BienSocial } from "@/lib/social/types";

// Diagnostic du rendu visuel — À OUVRIR DANS UN NAVIGATEUR.
//
// Sert à vérifier de visu que Marcellus et Outfit sont bien appliquées EN
// PRODUCTION. Les polices sont résolues par fontconfig sur le SYSTÈME hôte
// (voir lib/social/visuel.ts) : un rendu correct en local ne garantit rien
// sur Hostinger, où le repli sur une police générique se ferait
// silencieusement, sans erreur ni log.
//
// Strictement en LECTURE : aucune écriture en base, aucun dépôt dans
// medias-social, aucun appel à l'API Meta. Le JPEG est composé en mémoire et
// renvoyé tel quel.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function texte(message: string, statut: number): Response {
  return new Response(message, {
    status: statut,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function secretValide(fourni: string | null, attendu: string): boolean {
  if (!fourni) return false;
  const a = Buffer.from(fourni);
  const b = Buffer.from(attendu);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  const attendu = process.env.SOCIAL_CRON_SECRET;
  if (!attendu) return texte("SOCIAL_CRON_SECRET non configurée sur ce serveur.", 503);

  const params = req.nextUrl.searchParams;
  if (!secretValide(params.get("secret"), attendu)) return texte("Non autorisé.", 401);

  try {
    const admin = createAdminClient();
    const bienId = params.get("bien_id");

    const colonnes =
      "id, reference, slug, titre, type, transaction, ville, quartier, prix, surface, chambres, salles_bain, photos";

    // Sans bien_id : le bien finalisé le plus récent.
    const requete = bienId
      ? admin.from("biens").select(colonnes).eq("id", bienId).maybeSingle()
      : admin.from("biens").select(colonnes).eq("statut", "finalise")
          .order("cree_le", { ascending: false }).limit(1).maybeSingle();

    const { data, error } = await requete;
    if (error) return texte(`Lecture du bien impossible : ${error.message}`, 500);
    if (!data) {
      return texte(
        bienId
          ? `Aucun bien avec l'identifiant ${bienId}.`
          : "Aucun bien en statut 'finalise'. Passez-en un en finalisé, ou précisez ?bien_id=…",
        404
      );
    }

    const bien = data as unknown as BienSocial;
    const photo = bien.photos?.[0];
    if (!photo) {
      return texte(`Le bien ${bien.reference ?? bien.id} n'a aucune photo — visuel impossible.`, 422);
    }

    const reponsePhoto = await fetch(photo);
    if (!reponsePhoto.ok) {
      return texte(`Photo source inaccessible (HTTP ${reponsePhoto.status}) : ${photo}`, 502);
    }

    const jpeg = await composerStory(Buffer.from(await reponsePhoto.arrayBuffer()), bien);

    return new Response(new Uint8Array(jpeg), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        // Jamais de cache : on veut voir le rendu du déploiement courant.
        "Cache-Control": "no-store, max-age=0",
        "X-Hoomy-Bien": bien.reference ?? bien.id,
      },
    });
  } catch (e) {
    // Message complet en clair : une 500 muette ne dirait rien du problème
    // de police, qui est justement ce qu'on cherche à diagnostiquer.
    const message = e instanceof Error ? `${e.message}\n\n${e.stack ?? ""}` : String(e);
    return texte(`Échec de la composition du visuel :\n\n${message}`, 500);
  }
}
