import Link from "next/link";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";

type Props = {
  titre: string;
  description?: string;
};

export default function PageEnConstruction({ titre, description }: Props) {
  return (
    <main style={{ background: "var(--fond-principal)", minHeight: "100vh" }}>
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8"
          style={{ background: "var(--fond-vert-leger)" }}
        >
          <span className="text-3xl">🏗️</span>
        </div>
        <h1
          className="font-normal mb-4"
          style={{
            fontFamily: "var(--font-marcellus), serif",
            color: "var(--primaire)",
            fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
          }}
        >
          {titre}
        </h1>
        <p className="text-base leading-relaxed mb-10" style={{ color: "var(--texte-secondaire)" }}>
          {description ?? "Cette page est en cours de construction. Revenez bientôt !"}
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
          style={{
            background: "var(--primaire)",
            color: "var(--fond-secondaire)",
            textDecoration: "none",
          }}
        >
          ← Retour à l'accueil
        </Link>
      </div>
      <Footer />
    </main>
  );
}
