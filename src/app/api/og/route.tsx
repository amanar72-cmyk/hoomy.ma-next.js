import { NextRequest } from "next/server";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";
import { formaterPrix } from "@/lib/format";
import { tracerTexte, largeurTexte } from "@/lib/social/polices";

// Image d'aperçu partagée sur WhatsApp / Facebook (1200×630).
//
// POURQUOI SHARP ET NON `next/og`
// Cette route utilisait ImageResponse (satori + resvg en WASM). En production
// elle renvoyait systématiquement 503 après ~5 s — et c'était la page d'erreur
// de HOSTINGER, pas une erreur Next.js : le processus n'y survivait pas.
// Conséquence visible : WhatsApp ne récupérait aucune image et retombait sur le
// logo générique du site.
//
// On reprend donc la pipeline déjà éprouvée EN PRODUCTION par le module de
// publication sociale : composition sharp + textes convertis en chemins
// vectoriels (lib/social/polices.ts — aucune police système requise, ce qui
// avait déjà posé problème sur cet hébergement). Cette pipeline compose un
// 1080×1920 en 2,6 s là où ImageResponse mourait.

export const runtime = "nodejs";

const SITE = "hoomy.ma";
const TIMEOUT_PHOTO_MS = 2500;

const L = 1200;
const H = 630;
const M = 52; // marge intérieure
const VERT_PROFOND = "#0A1F18";
const OR = "#D4AF37";
const CACHE = "public, immutable, no-transform, max-age=86400";

type BienOG = {
  slug: string | null;
  titre: string;
  prix: number;
  transaction: string | null;
  ville: string;
  surface: number | null;
  chambres: number | null;
  photos: string[] | null;
  type: string;
};

/** Télécharge une image, ou null. Ne lève jamais, ne bloque jamais. */
async function telecharger(url: string, timeoutMs: number): Promise<Buffer | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Variante transformée Supabase : plus légère et plus rapide à télécharger. */
function urlPhotoTransformee(objectUrl: string): string | null {
  const marqueur = "/storage/v1/object/public/";
  if (!objectUrl.includes(marqueur)) return null;
  return (
    objectUrl.replace(marqueur, "/storage/v1/render/image/public/") +
    (objectUrl.includes("?") ? "&" : "?") +
    "width=1200&quality=80&resize=cover"
  );
}

/** Découpe le titre sur au plus `maxLignes`, à la largeur disponible. */
function couperTitre(titre: string, taille: number, largeurMax: number, maxLignes = 2): string[] {
  const mots = titre.trim().split(/\s+/);
  const lignes: string[] = [];
  let courante = "";
  let deborde = false;

  for (const mot of mots) {
    const essai = courante ? `${courante} ${mot}` : mot;
    if (largeurTexte("corps", essai, taille) <= largeurMax) {
      courante = essai;
      continue;
    }
    if (courante) lignes.push(courante);
    if (lignes.length === maxLignes) { deborde = true; break; }
    courante = mot;
  }
  if (!deborde && courante) {
    if (lignes.length < maxLignes) lignes.push(courante);
    else deborde = true;
  }

  if (deborde && lignes.length === maxLignes) {
    let coupe = lignes[maxLignes - 1];
    while (coupe && largeurTexte("corps", `${coupe}…`, taille) > largeurMax) coupe = coupe.slice(0, -1);
    lignes[maxLignes - 1] = `${coupe}…`;
  }
  return lignes.length ? lignes : [titre];
}

/** Un <path> rempli à partir d'un texte vectorisé. */
function chemin(
  famille: "titre" | "corps",
  texte: string,
  x: number,
  y: number,
  taille: number,
  couleur: string,
  opacite = 1,
  interLettre = 0
): string {
  if (!texte) return "";
  const { d } = tracerTexte(famille, texte, x, y, taille, interLettre);
  if (!d) return "";
  const op = opacite === 1 ? "" : ` fill-opacity="${opacite}"`;
  return `<path d="${d}" fill="${couleur}"${op}/>`;
}

function svgCarte(o: {
  titre: string;
  lieuType: string;
  prixFormate: string;
  transLabel: string;
  details: string;
  avecPhoto: boolean;
}): string {
  // Le QR occupe le coin bas-droit : le texte s'arrête avant.
  const largeurTexteMax = L - M * 2 - 210;

  // Voile dégradé : léger en haut, dense en bas, pour que le texte reste
  // lisible quelle que soit la photo.
  const voile = o.avecPhoto
    ? `<defs>
         <linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
           <stop offset="0%"   stop-color="${VERT_PROFOND}" stop-opacity="0.45"/>
           <stop offset="28%"  stop-color="${VERT_PROFOND}" stop-opacity="0.10"/>
           <stop offset="55%"  stop-color="${VERT_PROFOND}" stop-opacity="0.35"/>
           <stop offset="100%" stop-color="${VERT_PROFOND}" stop-opacity="0.94"/>
         </linearGradient>
       </defs>
       <rect width="${L}" height="${H}" fill="url(#v)"/>`
    : `<rect width="${L}" height="${H}" fill="${VERT_PROFOND}"/>`;

  // Badge transaction : largeur mesurée sur la police réelle.
  const tBadge = 17;
  const largeurBadge = largeurTexte("corps", o.transLabel, tBadge, 2) + 52;
  const xBadge = L - M - largeurBadge;

  const lignesTitre = couperTitre(o.titre, 33, largeurTexteMax);
  // Bloc bas ancré au pied : on remonte selon le nombre de lignes du titre.
  const yPrix = H - 96;
  const yFilet = yPrix - 62;
  const yTitreDerniere = yFilet - 26;
  const yTitrePremiere = yTitreDerniere - (lignesTitre.length - 1) * 42;
  const yLieu = yTitrePremiere - 40;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${H}">
  ${voile}

  <!-- Liseré or en retrait -->
  <rect x="20" y="20" width="${L - 40}" height="${H - 40}" rx="6"
        fill="none" stroke="${OR}" stroke-opacity="0.55" stroke-width="1.5"/>

  <!-- Marque -->
  ${chemin("corps", "HOOMY", M, 78, 30, OR, 1, 2)}
  ${chemin("corps", ".MA", M + largeurTexte("corps", "HOOMY", 30, 2), 78, 30, "#FFFFFF", 0.75)}

  <!-- Badge transaction -->
  <rect x="${xBadge.toFixed(1)}" y="46" width="${largeurBadge.toFixed(1)}" height="40" rx="20" fill="${OR}"/>
  ${chemin("corps", o.transLabel, xBadge + 26, 73, tBadge, "#0F4C3A", 1, 2)}

  <!-- Ville · type -->
  ${chemin("corps", o.lieuType, M, yLieu, 17, OR, 1, 3)}

  <!-- Titre -->
  ${lignesTitre.map((l, i) => chemin("corps", l, M, yTitrePremiere + i * 42, 33, "#FFFFFF")).join("\n  ")}

  <!-- Filet doré -->
  <rect x="${M}" y="${yFilet}" width="68" height="3" rx="2" fill="${OR}"/>

  <!-- Prix -->
  ${chemin("titre", o.prixFormate, M, yPrix, 50, "#E9C766")}

  <!-- Détails -->
  ${chemin("corps", o.details, M, H - 52, 19, "#FFFFFF", 0.82)}
</svg>`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const slug = searchParams.get("slug");
  if (!slug) return new Response("Paramètre 'slug' manquant", { status: 400 });

  const CHAMPS = "slug, titre, prix, transaction, ville, surface, chambres, photos, type";
  let bien: BienOG | null = null;
  try {
    const { data } = await supabase.from("biens").select(CHAMPS).eq("slug", slug).maybeSingle();
    bien = (data as unknown as BienOG | null) ?? null;
    if (!bien && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)) {
      const { data: byId } = await supabase.from("biens").select(CHAMPS).eq("id", slug).maybeSingle();
      bien = (byId as unknown as BienOG | null) ?? null;
    }
  } catch {
    bien = null;
  }
  if (!bien) return new Response("Bien introuvable", { status: 404 });

  const transaction = bien.transaction ?? "vente";
  const prixFormate = formaterPrix(Number(bien.prix), transaction);
  const transLabel = transaction === "location" ? "À LOUER" : "À VENDRE";
  const bienUrl = `https://${SITE}/${transaction === "location" ? "louer" : "acheter"}/${bien.slug ?? slug}`;

  const details = [
    Number(bien.surface) > 0 ? `${bien.surface} m²` : null,
    bien.type !== "Terrain" && Number(bien.chambres) > 0
      ? `${bien.chambres} chambre${Number(bien.chambres) > 1 ? "s" : ""}`
      : null,
  ].filter(Boolean).join("   ·   ");

  const donnees = {
    titre: bien.titre,
    lieuType: [bien.ville, bien.type].filter(Boolean).join(" · ").toUpperCase(),
    prixFormate,
    transLabel,
    details,
  };

  // Photo de fond — facultative : la carte reste correcte sans.
  const objectUrl = Array.isArray(bien.photos) && bien.photos.length > 0 ? bien.photos[0] : null;
  let photo: Buffer | null = null;
  if (objectUrl) {
    const transformee = urlPhotoTransformee(objectUrl);
    if (transformee) photo = await telecharger(transformee, TIMEOUT_PHOTO_MS);
    if (!photo) photo = await telecharger(objectUrl, TIMEOUT_PHOTO_MS);
  }

  try {
    const sharp = (await import("sharp")).default;

    const fond = photo
      // Recadrage CENTRÉ, pas « attention » : la détection de saillance de
        // sharp privilégie les zones claires et uniformes — elle retenait le
        // ciel sur la villa et le PLAFOND sur l'appartement, soit exactement ce
        // qui ne vend pas. Le centre montre le bien. Contrepartie assumée : le
        // filigrane HOOMY incrusté au centre des photos ressort, ce qui fait
        // double emploi avec la marque en haut à gauche — un défaut mineur au
        // regard d'un aperçu qui montrerait un plafond.
        ? await sharp(photo).resize(L, H, { fit: "cover", position: "centre" }).toBuffer()
      : await sharp({ create: { width: L, height: H, channels: 3, background: VERT_PROFOND } })
          .png()
          .toBuffer();

    const calques: { input: Buffer; top: number; left: number }[] = [
      { input: Buffer.from(svgCarte({ ...donnees, avecPhoto: !!photo })), top: 0, left: 0 },
    ];

    // QR code, généré localement — jamais bloquant.
    try {
      const qrPng = await QRCode.toBuffer(bienUrl, {
        margin: 1,
        width: 116,
        color: { dark: "#0F4C3A", light: "#ffffff" },
      });
      const cadre = await sharp({
        create: { width: 134, height: 134, channels: 4, background: "#ffffff" },
      })
        .composite([{ input: qrPng, top: 9, left: 9 }])
        .png()
        .toBuffer();
      calques.push({ input: cadre, top: H - M - 134, left: L - M - 134 });
    } catch {
      // Sans QR la carte reste parfaitement valable.
    }

    const jpeg = await sharp(fond)
      .composite(calques)
      .jpeg({ quality: 82, chromaSubsampling: "4:2:0", mozjpeg: true })
      .toBuffer();

    return new Response(new Uint8Array(jpeg), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": CACHE },
    });
  } catch (e) {
    // Jamais de 500 : WhatsApp retomberait sur le logo générique. Au pire une
    // carte sans photo, toujours en 200.
    console.error("[og] composition échouée :", e instanceof Error ? e.message : e);
    try {
      const sharp = (await import("sharp")).default;
      const secours = await sharp({
        create: { width: L, height: H, channels: 3, background: VERT_PROFOND },
      })
        .composite([{ input: Buffer.from(svgCarte({ ...donnees, avecPhoto: false })), top: 0, left: 0 }])
        .jpeg({ quality: 82 })
        .toBuffer();
      return new Response(new Uint8Array(secours), {
        headers: { "Content-Type": "image/jpeg", "Cache-Control": CACHE },
      });
    } catch {
      return new Response("Image indisponible", { status: 500 });
    }
  }
}
