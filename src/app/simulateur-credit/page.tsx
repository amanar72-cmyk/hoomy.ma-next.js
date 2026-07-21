import type { Metadata } from "next";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import CalculateurCredit from "@/components/outils/CalculateurCredit";
import { SeparateurZellige } from "@/components/ui/MotifZellige";

export const metadata: Metadata = {
  title: "Simulateur de crédit immobilier | HOOMY.MA",
  description:
    "Calculez votre mensualité, le coût total du crédit et votre taux d'endettement. Simulateur de prêt immobilier adapté au marché marocain.",
};

type Props = { searchParams: Promise<{ prix?: string }> };

export default async function PageSimulateurCredit({ searchParams }: Props) {
  const { prix: prixParam } = await searchParams;
  const prixInitial = prixParam ? parseInt(prixParam.replace(/\D/g, ""), 10) || undefined : undefined;

  return (
    <main style={{ background: "var(--fond-principal)", minHeight: "100vh" }}>
      <Navbar />

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <section
        className="px-6 py-12 text-center"
        style={{ background: "linear-gradient(135deg, #0F4C3A 0%, #1a6b4a 50%, #146C43 100%)" }}
      >
        <p
          className="text-xs tracking-widest mb-3"
          style={{ color: "var(--accent)", letterSpacing: "0.2em" }}
        >
          OUTIL · SIMULATION GRATUITE
        </p>
        {/* En-tête en dégradé fixe (toujours vert) : var(--fond-secondaire)
            deviendrait vert nuit en mode sombre → titre invisible. */}
        <h1
          className="text-3xl md:text-4xl font-normal mb-3"
          style={{ fontFamily: "var(--font-marcellus), serif", color: "#fff" }}
        >
          Simulateur de crédit immobilier
        </h1>
        <p
          className="text-sm max-w-lg mx-auto leading-relaxed"
          style={{ color: "#C9D5CF" }}
        >
          Calculez votre mensualité, le coût total de votre prêt et évaluez
          votre taux d'endettement selon les critères des banques marocaines.
        </p>
      </section>

      <SeparateurZellige
        className="max-w-3xl mx-auto px-6 py-2"
        couleur="var(--accent)"
        opacite={0.25}
        tailleEtoile={16}
      />

      {/* ── Calculateur ─────────────────────────────────────────────────── */}
      <CalculateurCredit prixInitial={prixInitial} />

      <Footer />
    </main>
  );
}
