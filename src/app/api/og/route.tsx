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
    // La carte OG est vue en PETIT dans l'aperçu WhatsApp : une source modérée
    // (640 px) reste nette à l'affichage tout en réduisant fortement l'entropie
    // du PNG rendu en 1200×380 → sortie < 600 Ko et moins de CPU (anti-503).
    "width=640&quality=80&resize=cover"
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
          photo={photo}
          qr={qr}
        />
      ),
      REPONSE_IMG
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

// Design « bandeau » : photo en haut (~380 px), liseré Or, bas PLEIN Vert Royal.
// Le grand aplat vert du bas se compresse quasi gratuitement en PNG → sortie
// bien plus légère (cible 300–600 Ko) et moins de CPU (marge anti-503).
const H_PHOTO = 380;
const H_LISERE = 4;
const H_BAS = 630 - H_PHOTO - H_LISERE; // 246

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
    <div style={{ display: "flex", flexDirection: "column", width: "1200px", height: "630px", fontFamily: "sans-serif", overflow: "hidden" }}>

      {/* ── Bandeau photo (haut) ─────────────────────────────────────────── */}
      <div style={{ display: "flex", position: "relative", width: "1200px", height: `${H_PHOTO}px`, overflow: "hidden" }}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" style={{ width: "1200px", height: `${H_PHOTO}px`, objectFit: "cover" }} />
        ) : (
          <div style={{ display: "flex", width: "1200px", height: `${H_PHOTO}px`, background: "linear-gradient(135deg,#146C43 0%,#0F4C3A 60%,#0a2e22 100%)" }} />
        )}
        {/* Badge transaction (sur la photo, haut droite) */}
        <div style={{ position: "absolute", top: 28, right: 40, background: "#D4AF37", borderRadius: "8px", padding: "7px 18px", display: "flex" }}>
          <span style={{ color: "#0F4C3A", fontSize: 15, fontWeight: 700, letterSpacing: 1.5 }}>{transLabel}</span>
        </div>
      </div>

      {/* ── Liseré Or ────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", width: "1200px", height: `${H_LISERE}px`, background: "#D4AF37" }} />

      {/* ── Bas plein Vert Royal ─────────────────────────────────────────── */}
      <div style={{ display: "flex", width: "1200px", height: `${H_BAS}px`, background: "#0F4C3A", padding: "28px 44px", justifyContent: "space-between", alignItems: "stretch" }}>

        {/* Colonne gauche : ville·type, titre, prix */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between", paddingRight: 28 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#D4AF37", fontSize: 15, fontWeight: 600, letterSpacing: 2, marginBottom: 8, textTransform: "uppercase", display: "flex" }}>
              {ville} · {type}
            </span>
            <span style={{ color: "#ffffff", fontSize: 27, fontWeight: 700, lineHeight: 1.2, display: "flex", maxWidth: "620px", overflow: "hidden", maxHeight: "66px" }}>
              {titre}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#D4AF37", fontSize: 42, fontWeight: 700, display: "flex" }}>{prixFormate}</span>
            {specs.length > 0 && (
              <span style={{ color: "rgba(255,255,255,0.72)", fontSize: 16, display: "flex", marginTop: 6 }}>
                {specs.join("  ·  ")}
              </span>
            )}
          </div>
        </div>

        {/* Colonne droite : logo HOOMY + QR local */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ color: "#D4AF37", fontSize: 26, fontWeight: 700, letterSpacing: 1 }}>HOOMY</span>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 26, fontWeight: 400 }}>.MA</span>
          </div>
          {qr ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ background: "#ffffff", borderRadius: 12, padding: 8, display: "flex" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="QR" style={{ width: 104, height: 104 }} />
              </div>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 6, display: "flex" }}>Scanner l&apos;annonce</span>
            </div>
          ) : (
            <span style={{ color: "rgba(255,255,255,0.38)", fontSize: 14, display: "flex" }}>{SITE}</span>
          )}
        </div>
      </div>
    </div>
  );
}
