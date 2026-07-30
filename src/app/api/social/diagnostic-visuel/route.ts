import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { composerStory, svgDeDiagnostic } from "@/lib/social/visuel";
import { etatPolices, tracerTexte } from "@/lib/social/polices";
import { normaliserPhotoFeed, resumerNormalisation } from "@/lib/social/photoFeed";
import type { BienSocial } from "@/lib/social/types";

// Diagnostic du rendu visuel — À OUVRIR DANS UN NAVIGATEUR.
//
// Sert à vérifier de visu que le texte est bien dessiné EN PRODUCTION. Les
// textes sont convertis en chemins vectoriels (voir lib/social/polices.ts) :
// plus aucune police système n'intervient au rendu.
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

  // ?mode=infos → rapport texte sur l'état des polices, sans composer d'image.
  // Indispensable : un visuel sans texte ne dit pas POURQUOI il n'y en a pas.
  if (params.get("mode") === "infos") {
    const etat = etatPolices();
    let trace = "non testé";
    try {
      const t = tracerTexte("titre", "HOOMY 123", 0, 0, 76);
      // Un chemin vide signifierait que les glyphes ne produisent rien.
      trace = t.d.length > 100
        ? `OK — ${t.d.length} caractères de chemin, largeur ${Math.round(t.largeur)} px`
        : `ÉCHEC — chemin vide ou quasi vide (${t.d.length} caractères)`;
    } catch (e) {
      trace = `exception : ${e instanceof Error ? e.message : String(e)}`;
    }

    return texte(
      [
        "DIAGNOSTIC POLICES — module de publication sociale",
        "".padEnd(52, "="),
        "Méthode : texte converti en chemins vectoriels (aucune police système).",
        "",
        `Répertoire de travail : ${process.cwd()}`,
        `Polices chargées      : ${etat.ok ? "OUI" : "NON"}`,
        `Source trouvée        : ${etat.sourceTrouvee ?? "AUCUNE"}`,
        etat.erreur ? `Erreur                : ${etat.erreur}` : "",
        "",
        "Emplacements testés :",
        ...etat.candidatsTestes.map((c: string) => `  - ${c}`),
        "",
        `Tracé vectoriel réel  : ${trace}`,
      ].filter(Boolean).join("\n"),
      etat.ok ? 200 : 500
    );
  }

  const modeSvg = params.get("mode") === "svg";

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

    // ?mode=svg → SVG brut, pour inspecter l'assemblage sans passer par sharp.
    if (modeSvg) return texte(svgDeDiagnostic(bien), 200);

    // ?mode=feed[&n=2] → photo du carrousel normalisée en 4:5, telle qu'elle
    // partira à Graph. Aucun dépôt, aucun appel Meta : simple prévisualisation.
    if (params.get("mode") === "feed") {
      const n = Math.max(1, Math.min(10, Number(params.get("n") ?? 1) || 1));
      const source = bien.photos?.[n - 1];
      if (!source) return texte(`Le bien ${bien.reference ?? bien.id} n'a pas de photo n°${n}.`, 404);

      const reponseN = await fetch(source);
      if (!reponseN.ok) return texte(`Photo n°${n} inaccessible (HTTP ${reponseN.status}).`, 502);

      const { jpeg: normalisee, infos } = await normaliserPhotoFeed(
        Buffer.from(await reponseN.arrayBuffer())
      );
      return new Response(new Uint8Array(normalisee), {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "no-store, max-age=0",
          // Les en-têtes HTTP n'acceptent que du latin-1 : « → » et « × »
          // feraient échouer la construction de la Response.
          "X-Hoomy-Normalisation": resumerNormalisation(n, infos).replace(/[^\x20-\x7E]/g, "-"),
        },
      });
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
