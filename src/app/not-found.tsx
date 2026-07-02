import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page introuvable | HOOMY.MA",
};

// Page 404 personnalisée — identité HOOMY (Vert Royal, Or, Marcellus)
export default function NotFound() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: "linear-gradient(160deg,#f0f7f4 0%,#FAF7F0 60%,#f5efe3 100%)" }}
    >
      {/* Arche marocaine stylisée */}
      <div
        className="flex items-end justify-center mb-8"
        style={{
          width: 120,
          height: 140,
          borderRadius: "60px 60px 0 0",
          background: "linear-gradient(160deg, #0F4C3A 0%, #146C43 100%)",
          boxShadow: "0 16px 48px rgba(15,76,58,0.25)",
        }}
      >
        <span
          className="mb-6 text-4xl font-normal"
          style={{ fontFamily: "var(--font-marcellus), serif", color: "#D4AF37" }}
        >
          404
        </span>
      </div>

      <h1
        className="text-2xl md:text-3xl font-normal mb-3"
        style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}
      >
        Cette page est introuvable
      </h1>
      <p className="text-sm max-w-md mb-8" style={{ color: "#6B7A71" }}>
        Le bien que vous cherchez a peut-être été vendu, loué ou déplacé.
        Explorez nos annonces vérifiées pour trouver votre prochain chez-vous.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="text-sm font-semibold px-6 py-3 rounded-xl transition-opacity hover:opacity-90"
          style={{ background: "#0F4C3A", color: "#fff", textDecoration: "none" }}
        >
          Retour à l&apos;accueil
        </Link>
        <Link
          href="/acheter"
          className="text-sm font-semibold px-6 py-3 rounded-xl transition-colors"
          style={{ border: "1.5px solid #0F4C3A", color: "#0F4C3A", textDecoration: "none", background: "transparent" }}
        >
          Biens à vendre
        </Link>
        <Link
          href="/louer"
          className="text-sm font-semibold px-6 py-3 rounded-xl transition-colors"
          style={{ border: "1.5px solid #0F4C3A", color: "#0F4C3A", textDecoration: "none", background: "transparent" }}
        >
          Biens à louer
        </Link>
      </div>
    </main>
  );
}
