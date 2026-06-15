export default function Logo({ size = 34 }: { size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <svg viewBox="0 0 60 66" width={size} height={Math.round(size * 1.1)} aria-hidden="true">
        <path d="M16 56 L16 24" stroke="#0F4C3A" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M44 56 L44 24" stroke="#0F4C3A" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M16 24 Q30 8 44 24" fill="none" stroke="#D4AF37" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M16 40 L44 40" stroke="#D4AF37" strokeWidth="3.2" strokeLinecap="round" />
      </svg>
      <span style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A", fontSize: 21, letterSpacing: 2 }}>
        HOOMY<span style={{ color: "#D4AF37" }}>.MA</span>
      </span>
    </span>
  );
}