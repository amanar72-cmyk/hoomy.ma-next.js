import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#0F4C3A",
          borderRadius: 6,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        {/* Toit doré */}
        <svg width="22" height="9" viewBox="0 0 22 9">
          <path
            d="M1 8 L11 1 L21 8"
            fill="none"
            stroke="#D4AF37"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {/* Lettre H */}
        <div style={{ position: "relative", width: 16, height: 11, display: "flex" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: 4, height: 11, background: "#FAF7F0", borderRadius: 1 }} />
          <div style={{ position: "absolute", right: 0, top: 0, width: 4, height: 11, background: "#FAF7F0", borderRadius: 1 }} />
          <div style={{ position: "absolute", left: 0, top: 3, width: 16, height: 5, background: "#FAF7F0", borderRadius: 1 }} />
        </div>
      </div>
    ),
    { width: 32, height: 32 },
  );
}
