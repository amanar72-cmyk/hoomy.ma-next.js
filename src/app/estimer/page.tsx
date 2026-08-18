import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { FondZellige } from "@/components/ui/MotifZellige";

export const metadata: Metadata = {
  title: "Estimation immobilière — bientôt disponible",
  description:
    "L'estimation en ligne HOOMY arrive très bientôt. En attendant, déposez votre bien ou demandez à être rappelé par un conseiller.",
};

// L'outil d'estimation est temporairement masqué le temps de fiabiliser les
// données de prix du marché. Le composant WizardEstimation est conservé pour
// réactivation. Cette page reste accessible (URL indexable) et redirige
// l'intention vers le dépôt de bien / le rappel conseiller.

export default function PageEstimer() {
  return (
    <main style={{ background: "var(--fond-principal)", minHeight: "100vh" }}>
      <Navbar />

      <section className="max-w-3xl mx-auto px-6 py-20 lg:py-28">
        <div
          className="rounded-3xl overflow-hidden relative px-8 py-14 lg:px-14 lg:py-20 text-center"
          style={{ background: "var(--primaire)" }}
        >
          <FondZellige couleur="rgba(255,255,255,0.07)" opacite={1} taille={78} patternId="zellige-estimer" />

          <div className="relative">
            {/* Badge */}
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6"
              style={{ background: "rgba(212,175,55,0.16)", color: "var(--texte-sur-primaire)", border: "1px solid rgba(212,175,55,0.3)" }}
            >
              <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--texte-sur-primaire)", display: "inline-block" }} />
              Bientôt disponible
            </span>

            <h1
              className="text-3xl lg:text-4xl font-normal mb-4 leading-snug"
              style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--texte-sur-primaire)" }}
            >
              L&apos;estimation en ligne arrive très bientôt
            </h1>
            <p className="text-sm lg:text-base leading-relaxed mb-9 max-w-xl mx-auto" style={{ color: "var(--texte-sur-primaire)", opacity: 0.75 }}>
              Nous finalisons notre modèle basé sur les prix réels du marché marocain pour vous
              donner une estimation juste et fiable. En attendant, un conseiller HOOMY peut
              estimer votre bien et vous accompagner dès aujourd&apos;hui.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <Link
                href="/publier"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold transition-transform hover:scale-[1.02]"
                style={{ background: "var(--accent)", color: "var(--texte-sur-accent)", textDecoration: "none" }}
              >
                Déposer mon bien
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <Link
                href="/#contact-conseiller"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl text-sm font-semibold"
                style={{ background: "transparent", color: "var(--texte-sur-primaire)", border: "1.5px solid var(--texte-sur-primaire)", textDecoration: "none" }}
              >
                Être rappelé par un conseiller
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
