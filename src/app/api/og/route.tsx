import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";
import { formaterPrix } from "@/lib/format";

export const runtime = "nodejs";

const SITE = "hoomy.ma";
const TIMEOUT_PHOTO_MS = 2500;

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

// ── Helpers réseau (robustes : jamais d'exception qui remonte) ────────────────

/**
 * Récupère une image et la renvoie en data URL base64, ou null si échec/timeout.
 * On fait le fetch NOUS-MÊMES (avec AbortController) plutôt que de laisser Satori
 * le faire en interne sans contrôle : une photo lente ne fait plus pendre la
 * requête (cause probable des 503 Hostinger).
 */
async function imageEnDataUrl(url: string, timeoutMs: number): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get("content-type") || "image/jpeg";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Variante « transformée » Supabase (plus légère + plus rapide à télécharger)
 * quand la photo est un objet public du bucket. Fallback géré par l'appelant.
 */
function urlPhotoTransformee(objectUrl: string): string | null {
  const marqueur = "/storage/v1/object/public/";
  if (!objectUrl.includes(marqueur)) return null;
  return (
    objectUrl.replace(marqueur, "/storage/v1/render/image/public/") +
    (objectUrl.includes("?") ? "&" : "?") +
    // Design pleine photo : source 800 px, nette une fois étirée en 1200×630 ;
    // le voile sombre du bas réduit l'entropie du PNG → poids/CPU maîtrisés.
    "width=800&quality=78&resize=cover"
  );
}

/** QR code généré LOCALEMENT (aucun appel réseau) → data URL PNG, ou null. */
async function qrDataUrl(texte: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(texte, {
      margin: 1,
      width: 140,
      color: { dark: "#0F4C3A", light: "#ffffff" },
    });
  } catch {
    return null;
  }
}

const REPONSE_IMG = {
  width: 1200,
  height: 630,
  headers: {
    // WhatsApp/Facebook cachent agressivement — on aide le cache côté CDN.
    "Cache-Control": "public, immutable, no-transform, max-age=86400",
  },
} as const;

/**
 * Convertit le PNG produit par Satori en JPEG (~5–8× plus léger) :
 * indispensable avec le design pleine photo pour rester sous la limite
 * d'aperçu WhatsApp (~600 Ko). Repli : PNG d'origine si sharp échoue.
 */
async function reponseJpeg(img: ImageResponse): Promise<Response> {
  const png = Buffer.from(await img.arrayBuffer());
  try {
    const sharp = (await import("sharp")).default;
    const jpeg = await sharp(png).jpeg({ quality: 82 }).toBuffer();
    return new Response(new Uint8Array(jpeg), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": REPONSE_IMG.headers["Cache-Control"] },
    });
  } catch {
    return new Response(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": REPONSE_IMG.headers["Cache-Control"] },
    });
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const slug = searchParams.get("slug");

  if (!slug) {
    return new Response("Paramètre 'slug' manquant", { status: 400 });
  }

  // Recherche par slug, puis par UUID en fallback (même logique que les fiches)
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

  if (!bien) {
    return new Response("Bien introuvable", { status: 404 });
  }

  const transaction = bien.transaction ?? "vente";
  const prixFormate = formaterPrix(Number(bien.prix), transaction);
  const transLabel = transaction === "location" ? "À LOUER" : "À VENDRE";
  const bienUrl = `https://${SITE}/${transaction === "location" ? "louer" : "acheter"}/${bien.slug ?? slug}`;

  // Photo : on privilégie la version TRANSFORMÉE (résolution modérée, haute
  // qualité) — propre mais légèrement adoucie → PNG de sortie beaucoup plus
  // léger (cible < 600 Ko) et moins de CPU (marge anti-503). Fallback sur
  // l'originale si la transform n'est pas disponible, puis carte sans photo.
  const objectUrl = Array.isArray(bien.photos) && bien.photos.length > 0 ? bien.photos[0] : null;
  let photo: string | null = null;
  if (objectUrl) {
    const transformee = urlPhotoTransformee(objectUrl);
    if (transformee) photo = await imageEnDataUrl(transformee, TIMEOUT_PHOTO_MS);
    if (!photo) photo = await imageEnDataUrl(objectUrl, TIMEOUT_PHOTO_MS);
  }

  // QR local (jamais bloquant)
  const qr = await qrDataUrl(bienUrl);

  // Try/catch global : au pire on renvoie une carte dégradée (sans photo) en 200,
  // jamais une 500 qui ferait retomber WhatsApp sur le logo.
  try {
    return await reponseJpeg(
      new ImageResponse(
        (
          <CarteOG
            titre={bien.titre}
            ville={bien.ville}
            type={bien.type}
            prixFormate={prixFormate}
            transLabel={transLabel}
            surface={bien.surface}
            chambres={bien.chambres}
            photo={photo}
            qr={qr}
          />
        ),
        REPONSE_IMG
      )
    );
  } catch {
    // Ultime filet : carte texte seule (aucune image externe), toujours 200
    return new ImageResponse(
      (
        <CarteOG
          titre={bien.titre}
          ville={bien.ville}
          type={bien.type}
          prixFormate={prixFormate}
          transLabel={transLabel}
          surface={bien.surface}
          chambres={bien.chambres}
          photo={null}
          qr={null}
        />
      ),
      REPONSE_IMG
    );
  }
}

// ── Composant carte ───────────────────────────────────────────────────────────

// Design « luxe pleine photo » : la photo du bien couvre TOUTE la carte
// (comme un visuel d'agence haut de gamme), voile dégradé Vert profond pour la
// lisibilité, fin cadre doré en retrait, prix en Or, QR local en bas à droite.
// Sans photo : fond dégradé Vert Royal, même mise en page (jamais d'erreur).

function CarteOG({
  titre, ville, type, prixFormate, transLabel, surface, chambres, photo, qr,
}: {
  titre: string; ville: string; type: string; prixFormate: string; transLabel: string;
  surface: number | null; chambres: number | null; photo: string | null; qr: string | null;
}) {
  const specs: string[] = [];
  if (Number(surface) > 0) specs.push(`${surface} m²`);
  if (type !== "Terrain" && Number(chambres) > 0) {
    specs.push(`${chambres} chambre${Number(chambres) > 1 ? "s" : ""}`);
  }

  return (
    <div style={{ display: "flex", position: "relative", width: "1200px", height: "630px", fontFamily: "sans-serif", overflow: "hidden", background: "#0A1F18" }}>

      {/* ── Photo pleine carte (ou fond Vert Royal en secours) ───────────── */}
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt=""
          style={{ position: "absolute", top: 0, left: 0, width: "1200px", height: "630px", objectFit: "cover" }}
        />
      ) : (
        <div style={{ position: "absolute", top: 0, left: 0, width: "1200px", height: "630px", display: "flex", background: "linear-gradient(135deg,#146C43 0%,#0F4C3A 55%,#0a2e22 100%)" }} />
      )}

      {/* ── Voiles de lisibilité : dégradé fort en bas, léger en haut ─────── */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "1200px", height: "630px", display: "flex", background: "linear-gradient(180deg, rgba(7,26,19,0.42) 0%, rgba(7,26,19,0.05) 26%, rgba(7,26,19,0.10) 48%, rgba(7,26,19,0.62) 72%, rgba(7,26,19,0.92) 100%)" }} />

      {/* ── Fin cadre doré en retrait (signature luxe) ────────────────────── */}
      <div style={{ position: "absolute", top: 20, left: 20, width: "1160px", height: "590px", display: "flex", border: "1.5px solid rgba(212,175,55,0.55)", borderRadius: 6 }} />

      {/* ── Haut : logo à gauche, badge transaction à droite ──────────────── */}
      <div style={{ position: "absolute", top: 44, left: 52, right: 52, display: "flex", justifyContent: "space-between", alignItems: "center", width: "1096px" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ color: "#D4AF37", fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>HOOMY</span>
          <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 30, fontWeight: 400 }}>.MA</span>
        </div>
        <div style={{ display: "flex", background: "linear-gradient(135deg,#E9C766,#D4AF37)", borderRadius: 999, padding: "9px 24px", boxShadow: "0 4px 18px rgba(0,0,0,0.35)" }}>
          <span style={{ color: "#0F4C3A", fontSize: 16, fontWeight: 700, letterSpacing: 2 }}>{transLabel}</span>
        </div>
      </div>

      {/* ── Bas : infos bien à gauche, QR à droite ────────────────────────── */}
      <div style={{ position: "absolute", bottom: 44, left: 52, right: 52, display: "flex", justifyContent: "space-between", alignItems: "flex-end", width: "1096px" }}>

        {/* Colonne infos */}
        <div style={{ display: "flex", flexDirection: "column", maxWidth: "780px" }}>
          <span style={{ color: "#D4AF37", fontSize: 16, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10, display: "flex" }}>
            {ville} · {type}
          </span>
          <span style={{ color: "#ffffff", fontSize: 32, fontWeight: 600, lineHeight: 1.25, display: "flex", overflow: "hidden", maxHeight: "80px", textShadow: "0 2px 12px rgba(0,0,0,0.45)" }}>
            {titre}
          </span>
          {/* Filet doré */}
          <div style={{ display: "flex", width: 68, height: 3, background: "linear-gradient(90deg,#E9C766,#D4AF37)", borderRadius: 2, marginTop: 16, marginBottom: 14 }} />
          <span style={{ color: "#E9C766", fontSize: 48, fontWeight: 700, display: "flex", textShadow: "0 2px 14px rgba(0,0,0,0.5)" }}>
            {prixFormate}
          </span>
          {specs.length > 0 && (
            <span style={{ color: "rgba(255,255,255,0.82)", fontSize: 18, display: "flex", marginTop: 8 }}>
              {specs.join("   ·   ")}
            </span>
          )}
        </div>

        {/* QR local (jamais bloquant) */}
        {qr ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ background: "#ffffff", borderRadius: 14, padding: 9, display: "flex", boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR" style={{ width: 108, height: 108 }} />
            </div>
            <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 8, display: "flex", letterSpacing: 0.5 }}>Scanner l&apos;annonce</span>
          </div>
        ) : (
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, display: "flex" }}>{SITE}</span>
        )}
      </div>
    </div>
  );
}
