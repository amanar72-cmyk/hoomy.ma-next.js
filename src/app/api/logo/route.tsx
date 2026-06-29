import { ImageResponse } from "next/og";

export const contentType = "image/png";

// PNG 600×200 — utilisé comme logo dans les données structurées Schema.org
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 600,
          height: 200,
          background: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
          padding: "0 48px",
        }}
      >
        {/* Icône carrée */}
        <div
          style={{
            width: 112,
            height: 112,
            background: "#0F4C3A",
            borderRadius: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            flexShrink: 0,
          }}
        >
          <svg width="80" height="30" viewBox="0 0 80 30">
            <path
              d="M3 27 L40 3 L77 27"
              fill="none"
              stroke="#D4AF37"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div style={{ position: "relative", width: 56, height: 38, display: "flex" }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: 13, height: 38, background: "#FAF7F0", borderRadius: 3 }} />
            <div style={{ position: "absolute", right: 0, top: 0, width: 13, height: 38, background: "#FAF7F0", borderRadius: 3 }} />
            <div style={{ position: "absolute", left: 0, top: 13, width: 56, height: 12, background: "#FAF7F0", borderRadius: 2 }} />
          </div>
        </div>

        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "baseline", lineHeight: 1 }}>
          <span
            style={{
              fontSize: 76,
              fontFamily: "serif",
              fontWeight: 400,
              color: "#0F4C3A",
              letterSpacing: 6,
            }}
          >
            HOOMY
          </span>
          <span
            style={{
              fontSize: 76,
              fontFamily: "serif",
              fontWeight: 400,
              color: "#D4AF37",
              letterSpacing: 6,
            }}
          >
            .MA
          </span>
        </div>
      </div>
    ),
    { width: 600, height: 200 },
  );
}
