import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { flouterPosition } from "@/lib/geo/floutage";

// Flux catalogue immobilier Meta (Facebook/Instagram) au format CSV.
//
// Route PUBLIQUE non authentifiée → elle CONTOURNE la RLS via le service-role.
// Deux garde-fous en conséquence :
//   1. Liste blanche stricte des colonnes lues (COLONNES) — rien d'autre.
//   2. Les coordonnées RÉELLES ne sortent jamais : `id`/`latitude`/`longitude`
//      sont lus uniquement pour recalculer le floutage (même offset que la
//      carte du site, dérivé de l'id). Le mode ?debug=1 ne renvoie QUE
//      { reference, raison } — aucune coordonnée, aucun identifiant privé.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Liste blanche des colonnes lues en base (aucune autre) ──────────────────────
const COLONNES =
  "id, reference, slug, titre, description, type, transaction, prix, ville, quartier, " +
  "chambres, salles_bain, surface, latitude, longitude, photos, exclu_catalogue";

type BienFlux = {
  id: string;
  reference: string | null;
  slug: string | null;
  titre: string | null;
  description: string | null;
  type: string | null;
  transaction: string | null;
  prix: number | null;
  ville: string | null;
  quartier: string | null;
  chambres: number | null;
  salles_bain: number | null;
  surface: number | null;
  latitude: number | null;
  longitude: number | null;
  photos: string[] | null;
  exclu_catalogue: boolean | null;
};

const EN_TETE = [
  "home_listing_id", "name", "description", "availability", "url", "image[0].url",
  "price", "currency", "address", "property_type", "listing_type", "num_beds",
  "num_baths", "area_size", "area_unit", "neighborhood[0]", "latitude", "longitude",
  "custom_label_0", "custom_label_1",
];

// Région administrative dérivée de la ville (pas de colonne région en base).
const REGIONS: Record<string, string> = {
  Agadir: "Souss-Massa",
  Casablanca: "Casablanca-Settat",
  Rabat: "Rabat-Salé-Kénitra",
  Marrakech: "Marrakech-Safi",
  Tanger: "Tanger-Tétouan-Al Hoceïma",
  Fès: "Fès-Meknès",
};

// ── Helpers de formatage ────────────────────────────────────────────────────────

function nettoyerHtml(s: string | null): string {
  if (!s) return "";
  return String(s)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tronque sans couper un mot (utilisé pour `name`). */
function tronquerMot(s: string, max: number): string {
  const t = (s ?? "").trim();
  if (t.length <= max) return t;
  const c = t.slice(0, max);
  const i = c.lastIndexOf(" ");
  return (i > 0 ? c.slice(0, i) : c).trim();
}

/** Ville → clé stable minuscule sans accent (agadir, fes…) pour custom_label_0. */
function slugVille(v: string | null): string {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function trancheePrix(prix: number): string {
  if (prix < 1_000_000) return "moins_1M";
  if (prix <= 3_000_000) return "1M_3M";
  return "plus_3M";
}

function propertyType(type: string | null): string {
  const t = String(type ?? "").trim().toLowerCase();
  if (t === "appartement") return "apartment";
  if (t === "villa" || t === "maison" || t === "riad") return "house";
  if (t === "terrain") return "land";
  return "other"; // bureau, local commercial, défaut
}

/** Échappement CSV : guillemets doublés + entourage si virgule/guillemet/saut de ligne. */
function csv(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ── Sélection : raison d'exclusion du flux (null = inclus) ───────────────────────
function raisonExclusion(b: BienFlux): string | null {
  const photo = Array.isArray(b.photos) ? b.photos[0] : null;
  if (!photo) return "pas_de_photo";
  if (!b.prix || b.prix <= 0) return "prix_absent";
  if (!nettoyerHtml(b.description)) return "description_absente";
  if (!b.ville || !String(b.ville).trim()) return "ville_manquante";
  if (b.exclu_catalogue) return "exclu_catalogue";
  return null;
}

/** Construit les 20 champs CSV (dans l'ordre de EN_TETE) pour un bien inclus. */
function ligneBien(b: BienFlux): (string | number)[] {
  const location = b.transaction === "location";
  const seg = location ? "louer" : "acheter";
  const url =
    `https://hoomy.ma/${seg}/${b.slug}` +
    `?utm_source=facebook&utm_medium=paid&utm_campaign=catalogue&utm_content=${encodeURIComponent(b.reference ?? "")}`;

  const image = String((b.photos as string[])[0]).replace(/^http:\/\//i, "https://");
  const region = REGIONS[b.ville ?? ""] ?? (b.ville ?? "");
  const address = JSON.stringify({
    addr1: b.quartier || b.ville || "",
    city: b.ville ?? "",
    region,
    country: "MA",
  });

  // Coordonnées FLOUTÉES (même offset que la carte : clé = id). Jamais les réelles.
  const flou =
    typeof b.latitude === "number" && typeof b.longitude === "number"
      ? flouterPosition(b.id, b.latitude, b.longitude)
      : null;

  return [
    b.reference ?? "",                                     // home_listing_id
    tronquerMot(b.titre ?? "", 100),                       // name
    nettoyerHtml(b.description).slice(0, 500).trim(),      // description
    location ? "for_rent" : "for_sale",                    // availability
    url,                                                   // url
    image,                                                 // image[0].url
    `${Math.round(b.prix as number)} MAD`,                 // price
    "MAD",                                                 // currency
    address,                                               // address (JSON dans 1 cellule)
    propertyType(b.type),                                  // property_type
    location ? "for_rent_by_agent" : "for_sale_by_agent",  // listing_type
    b.chambres && b.chambres > 0 ? b.chambres : "",        // num_beds
    b.salles_bain && b.salles_bain > 0 ? b.salles_bain : "", // num_baths
    b.surface && b.surface > 0 ? Math.round(b.surface) : "", // area_size
    "sq_m",                                                // area_unit
    b.quartier ?? "",                                      // neighborhood[0]
    flou ? flou.lat : "",                                  // latitude (floutée)
    flou ? flou.lng : "",                                  // longitude (floutée)
    slugVille(b.ville),                                    // custom_label_0
    trancheePrix(b.prix as number),                        // custom_label_1
  ];
}

// ── Requête HEAD sur la photo (mode ?images=1) ──────────────────────────────────
async function inspecterImage(url: string): Promise<{
  content_length: number | null;
  content_type: string | null;
  alerte?: string[];
}> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    const cl = res.headers.get("content-length");
    const ct = res.headers.get("content-type");
    const type = ct ? ct.split(";")[0].trim().toLowerCase() : null;
    const alerte: string[] = [];
    if (cl && Number(cl) > 8 * 1024 * 1024) alerte.push("image_trop_lourde");
    if (type && type !== "image/jpeg" && type !== "image/png") alerte.push("type_non_supporte");
    return { content_length: cl ? Number(cl) : null, content_type: ct, ...(alerte.length ? { alerte } : {}) };
  } catch {
    return { content_length: null, content_type: null, alerte: ["head_echec"] };
  }
}

// ── Handler ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const debug = req.nextUrl.searchParams.get("debug") === "1";
  const avecImages = req.nextUrl.searchParams.get("images") === "1";

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("biens")
    .select(COLONNES)
    .eq("statut", "finalise")
    .order("reference", { ascending: true });

  if (error) {
    return NextResponse.json({ erreur: "Lecture des biens impossible." }, { status: 500 });
  }

  const biens = (data ?? []) as unknown as BienFlux[];

  // Partition inclus / exclus + alertes de cohérence sur TOUS les finalise.
  const inclus: BienFlux[] = [];
  const exclus: { reference: string | null; raison: string }[] = [];
  const alertesCoherence: { reference: string | null; alerte: string; dans_le_flux: boolean }[] = [];

  for (const b of biens) {
    const raison = raisonExclusion(b);
    const dansLeFlux = raison === null;
    if (dansLeFlux) inclus.push(b);
    else exclus.push({ reference: b.reference, raison: raison as string });

    // Cohérence prix ↔ type de transaction — sur tous les finalise, inclus ou non.
    const prix = b.prix ?? 0;
    let alerte: string | null = null;
    if (b.transaction !== "location" && prix < 150_000) alerte = "vente_prix_suspect";
    else if (b.transaction === "location" && prix > 100_000) alerte = "location_prix_suspect";
    if (alerte) alertesCoherence.push({ reference: b.reference, alerte, dans_le_flux: dansLeFlux });
  }

  // ── Mode diagnostic ───────────────────────────────────────────────────────────
  if (debug) {
    const sortie: Record<string, unknown> = {
      total_finalise: biens.length,
      inclus: inclus.length,
      exclus,
      alertes_coherence: alertesCoherence,
    };
    if (avecImages) {
      sortie.images = await Promise.all(
        inclus.map(async (b) => ({
          reference: b.reference,
          ...(await inspecterImage(String((b.photos as string[])[0]))),
        }))
      );
    }
    return NextResponse.json(sortie);
  }

  // ── CSV ─────────────────────────────────────────────────────────────────────
  const lignes = [EN_TETE.join(",")];
  for (const b of inclus) lignes.push(ligneBien(b).map(csv).join(","));
  const corps = lignes.join("\n");

  return new NextResponse(corps, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
