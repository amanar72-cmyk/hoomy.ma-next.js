import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Image Open Graph par défaut — utilisée par toutes les pages sans OG propre.
// Next.js App Router détecte ce fichier automatiquement (convention opengraph-image).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "linear-gradient(135deg, #0A3528 0%, #0F4C3A 55%, #146C43 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 36,
        }}
      >
        {/* Logo : icône + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
          {/* Icône H */}
          <div
            style={{
              width: 148,
              height: 148,
              background: "rgba(255,255,255,0.10)",
              borderRadius: 26,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
            }}
          >
            <svg width="108" height="40" viewBox="0 0 108 40">
              <path
                d="M4 36 L54 4 L104 36"
                fill="none"
                stroke="#D4AF37"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div style={{ position: "relative", width: 76, height: 50, display: "flex" }}>
              <div style={{ position: "absolute", left: 0, top: 0, width: 17, height: 50, background: "#FAF7F0", borderRadius: 4 }} />
              <div style={{ position: "absolute", right: 0, top: 0, width: 17, height: 50, background: "#FAF7F0", borderRadius: 4 }} />
              <div style={{ position: "absolute", left: 0, top: 17, width: 76, height: 17, background: "#FAF7F0", borderRadius: 3 }} />
            </div>
          </div>

          {/* Wordmark */}
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span style={{ fontSize: 116, fontFamily: "serif", fontWeight: 400, color: "#FAF7F0", letterSpacing: 10 }}>
              HOOMY
            </span>
            <span style={{ fontSize: 116, fontFamily: "serif", fontWeight: 400, color: "#D4AF37", letterSpacing: 10 }}>
              .MA
            </span>
          </div>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: 30,
            fontFamily: "sans-serif",
            fontWeight: 400,
            color: "rgba(250,247,240,0.65)",
            letterSpacing: 4,
            margin: 0,
            textTransform: "uppercase",
          }}
        >
          L&apos;immobilier premium au Maroc
        </p>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
