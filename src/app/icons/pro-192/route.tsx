import { ImageResponse } from "next/og";

export const contentType = "image/png";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          background: "#111111",
          borderRadius: 34,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Toit doré */}
        <div style={{ position: "relative", width: 140, height: 50, display: "flex" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              bottom: 0,
              width: 80,
              height: 13,
              background: "#D4AF37",
              borderRadius: 5,
              transform: "rotate(-35deg)",
              transformOrigin: "bottom right",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              width: 80,
              height: 13,
              background: "#D4AF37",
              borderRadius: 5,
              transform: "rotate(35deg)",
              transformOrigin: "bottom left",
            }}
          />
        </div>

        {/* Lettre H */}
        <div style={{ position: "relative", width: 108, height: 68, display: "flex", marginTop: 2 }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: 24, height: 68, background: "#FAF7F0", borderRadius: 5 }} />
          <div style={{ position: "absolute", right: 0, top: 0, width: 24, height: 68, background: "#FAF7F0", borderRadius: 5 }} />
          <div style={{ position: "absolute", left: 0, top: 22, width: 108, height: 22, background: "#FAF7F0", borderRadius: 4 }} />
        </div>
      </div>
    ),
    { width: 192, height: 192 },
  );
}
