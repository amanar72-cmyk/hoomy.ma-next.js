import { ImageResponse } from "next/og";

export const contentType = "image/png";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: "#111111",
          borderRadius: 90,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Toit doré */}
        <div style={{ position: "relative", width: 374, height: 134, display: "flex" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              bottom: 0,
              width: 214,
              height: 34,
              background: "#D4AF37",
              borderRadius: 12,
              transform: "rotate(-35deg)",
              transformOrigin: "bottom right",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              width: 214,
              height: 34,
              background: "#D4AF37",
              borderRadius: 12,
              transform: "rotate(35deg)",
              transformOrigin: "bottom left",
            }}
          />
        </div>

        {/* Lettre H */}
        <div style={{ position: "relative", width: 290, height: 182, display: "flex", marginTop: 6 }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: 64, height: 182, background: "#FAF7F0", borderRadius: 14 }} />
          <div style={{ position: "absolute", right: 0, top: 0, width: 64, height: 182, background: "#FAF7F0", borderRadius: 14 }} />
          <div style={{ position: "absolute", left: 0, top: 60, width: 290, height: 60, background: "#FAF7F0", borderRadius: 10 }} />
        </div>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
