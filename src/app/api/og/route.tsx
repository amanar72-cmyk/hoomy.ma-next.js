import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { formaterPrix } from "@/lib/format";

export const runtime = "nodejs";

const SITE = "hoomy.ma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const slug = searchParams.get("slug");

  if (!slug) {
    return new Response("Paramètre 'slug' manquant", { status: 400 });
  }

  // Recherche par slug, puis par UUID en fallback (même logique que les fiches)
  const CHAMPS = "slug, titre, prix, transaction, ville, surface, chambres, photos, type";
  let { data: bien } = await supabase
    .from("biens")
    .select(CHAMPS)
    .eq("slug", slug)
    .maybeSingle();

  if (!bien && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)) {
    const { data: byId } = await supabase
      .from("biens")
      .select(CHAMPS)
      .eq("id", slug)
      .maybeSingle();
    bien = byId;
  }

  if (!bien) {
    return new Response("Bien introuvable", { status: 404 });
  }

  const photoUrl: string | null =
    Array.isArray(bien.photos) && bien.photos.length > 0 ? bien.photos[0] : null;

  const transaction: string = bien.transaction ?? "vente";
  // Le QR code pointe toujours vers l'URL slug canonique
  const bienUrl = `https://${SITE}/${transaction === "location" ? "louer" : "acheter"}/${bien.slug ?? slug}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(bienUrl)}&size=140x140&bgcolor=ffffff&color=0F4C3A&margin=6&qzone=1`;

  const prixFormate = formaterPrix(Number(bien.prix), transaction);
  const transLabel = transaction === "location" ? "À LOUER" : "À VENDRE";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "1200px",
          height: "630px",
          position: "relative",
          fontFamily: "sans-serif",
          overflow: "hidden",
        }}
      >
        {/* ── Fond : photo du bien ou dégradé ─────────────────────────────── */}
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt=""
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "1200px",
              height: "630px",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "linear-gradient(135deg,#0F4C3A 0%,#0a2e22 100%)",
              display: "flex",
            }}
          />
        )}

        {/* ── Overlay dégradé ────────────────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "linear-gradient(to bottom, rgba(10,30,20,0.25) 0%, rgba(10,30,20,0.65) 40%, rgba(5,18,12,0.92) 100%)",
            display: "flex",
          }}
        />

        {/* ── Bandeau HOOMY (haut gauche) ────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            top: 36,
            left: 44,
            display: "flex",
            alignItems: "center",
            background: "rgba(255,255,255,0.10)",
            borderRadius: "10px",
            padding: "8px 18px",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          <span style={{ color: "#D4AF37", fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>
            HOOMY
          </span>
          <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 22, fontWeight: 400 }}>
            .MA
          </span>
        </div>

        {/* ── Badge transaction (haut droite) ───────────────────────────── */}
        <div
          style={{
            position: "absolute",
            top: 36,
            right: 44,
            background: "#D4AF37",
            borderRadius: "8px",
            padding: "6px 16px",
            display: "flex",
          }}
        >
          <span style={{ color: "#0F4C3A", fontSize: 14, fontWeight: 700, letterSpacing: 1.5 }}>
            {transLabel}
          </span>
        </div>

        {/* ── Contenu bas gauche ─────────────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            bottom: 44,
            left: 44,
            right: 220,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Ligne gold décorative */}
          <div
            style={{
              width: 48,
              height: 4,
              background: "#D4AF37",
              borderRadius: 2,
              marginBottom: 18,
              display: "flex",
            }}
          />

          {/* Ville + type */}
          <span
            style={{
              color: "#D4AF37",
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: 2,
              marginBottom: 10,
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            {bien.ville} · {bien.type}
          </span>

          {/* Titre */}
          <span
            style={{
              color: "#ffffff",
              fontSize: 30,
              fontWeight: 700,
              lineHeight: 1.25,
              marginBottom: 18,
              display: "flex",
              maxWidth: "720px",
            }}
          >
            {bien.titre}
          </span>

          {/* Prix */}
          <span
            style={{
              color: "#D4AF37",
              fontSize: 40,
              fontWeight: 700,
              marginBottom: 16,
              display: "flex",
            }}
          >
            {prixFormate}
          </span>

          {/* Caractéristiques */}
          <div style={{ display: "flex", gap: 24, marginBottom: 20 }}>
            {Number(bien.surface) > 0 && (
              <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 17, display: "flex" }}>
                {bien.surface} m²
              </span>
            )}
            {bien.type !== "Terrain" && Number(bien.chambres) > 0 && (
              <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 17, display: "flex" }}>
                {bien.chambres} chambre{Number(bien.chambres) > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* URL */}
          <span
            style={{
              color: "rgba(255,255,255,0.38)",
              fontSize: 14,
              display: "flex",
              letterSpacing: 0.5,
            }}
          >
            {SITE}
          </span>
        </div>

        {/* ── QR code (bas droite) ──────────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            bottom: 44,
            right: 44,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 14,
              padding: 10,
              display: "flex",
              boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="QR" style={{ width: 140, height: 140 }} />
          </div>
          <span
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: 12,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <span>Scanner pour</span>
            <span>voir l&apos;annonce</span>
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
