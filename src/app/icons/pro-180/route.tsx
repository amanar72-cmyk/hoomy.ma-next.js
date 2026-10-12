import { ImageResponse } from "next/og";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#111111",
          borderRadius: 32,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Toit doré */}
        <div style={{ position: "relative", width: 132, height: 46, display: "flex" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              bottom: 0,
              width: 76,
              height: 12,
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
              width: 76,
              height: 12,
              background: "#D4AF37",
              borderRadius: 5,
              transform: "rotate(35deg)",
              transformOrigin: "bottom left",
            }}
          />
        </div>

        {/* Lettre H */}
        <div style={{ position: "relative", width: 102, height: 64, display: "flex", marginTop: 2 }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: 22, height: 64, background: "#FAF7F0", borderRadius: 5 }} />
          <div style={{ position: "absolute", right: 0, top: 0, width: 22, height: 64, background: "#FAF7F0", borderRadius: 5 }} />
          <div style={{ position: "absolute", left: 0, top: 21, width: 102, height: 21, background: "#FAF7F0", borderRadius: 4 }} />
        </div>
      </div>
    ),
    { width: 180, height: 180 },
  );
}
