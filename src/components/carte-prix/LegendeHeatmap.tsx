"use client";

const STOPS = ["#2E6B5E", "#7FB28A", "#C9D17A", "#F2D06B", "#F0A85A", "#C25B4E"];

type Props = {
  min: number;
  max: number;
  median: number;
};

function fmt(n: number) {
  return n.toLocaleString("fr-FR") + " DH";
}

export default function LegendeHeatmap({ min, max, median }: Props) {
  const gradient = `linear-gradient(to right, ${STOPS.join(", ")})`;

  return (
    <div
      style={{
        padding: "10px 14px",
        background: "rgba(0,0,0,0.35)",
        borderRadius: 10,
        border: "1px solid rgba(212,175,55,0.15)",
      }}
    >
      <p
        style={{
          color: "#9BC4A8",
          fontSize: "0.7rem",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        Prix au m² (DH)
      </p>

      {/* Barre dégradé */}
      <div
        style={{
          height: 10,
          borderRadius: 5,
          background: gradient,
          marginBottom: 4,
        }}
      />

      {/* Étiquettes min / médian / max */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ color: "#9BC4A8", fontSize: "0.68rem" }}>{fmt(min)}</span>
        <span
          style={{
            color: "#D4AF37",
            fontSize: "0.68rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
          }}
        >
          <span>★</span>
          <span>{fmt(median)}</span>
        </span>
        <span style={{ color: "#9BC4A8", fontSize: "0.68rem" }}>{fmt(max)}</span>
      </div>
    </div>
  );
}
