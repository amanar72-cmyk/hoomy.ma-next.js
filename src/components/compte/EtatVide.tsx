import Link from "next/link";

export default function EtatVide({
  icone,
  titre,
  message,
  cta,
}: {
  icone: React.ReactNode;
  titre: string;
  message: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "#E8F5ED", color: "#0F4C3A" }}
      >
        {icone}
      </div>
      <p className="text-base font-medium mb-1.5" style={{ color: "#1f2a24" }}>
        {titre}
      </p>
      <p className="text-sm max-w-xs mb-5" style={{ color: "#9DB8AD" }}>
        {message}
      </p>
      {cta && (
        <Link
          href={cta.href}
          className="inline-block text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          style={{ background: "#D4AF37", color: "#0F4C3A", textDecoration: "none" }}
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
