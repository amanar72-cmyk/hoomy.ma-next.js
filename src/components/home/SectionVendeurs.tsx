import Link from "next/link";
import { FondZellige } from "@/components/ui/MotifZellige";

// Section « Vendeurs » — accueil : incite les propriétaires à confier leur bien.
// Deux parcours au choix : dépôt direct (/publier) ou rappel par un conseiller
// (ancre vers le formulaire de SectionLead). Server Component, aucune interactivité.

const AVANTAGES = [
  {
    titre: "Publication gratuite",
    desc: "Déposez votre bien sans frais, avec photos illimitées et une mise en ligne rapide.",
    Icone: IcCadeau,
  },
  {
    titre: "Conseiller dédié",
    desc: "Un expert HOOMY vous accompagne de l'estimation à la signature, 6j/7.",
    Icone: IcConseiller,
  },
  {
    titre: "Diffusion premium",
    desc: "Votre annonce vérifiée est mise en avant auprès d'acheteurs qualifiés.",
    Icone: IcDiffusion,
  },
  {
    titre: "Localisation protégée",
    desc: "L'adresse exacte n'est jamais exposée : vous gardez le contrôle des visites.",
    Icone: IcBouclier,
  },
];

export default function SectionVendeurs() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <div
        className="rounded-3xl overflow-hidden relative px-8 py-12 lg:px-14 lg:py-16"
        style={{ background: "var(--primaire)" }}
      >
        {/* Texture zellige en filigrane */}
        <FondZellige couleur="rgba(255,255,255,0.07)" opacite={1} taille={78} patternId="zellige-vendeurs" />

        <div className="relative">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: "var(--accent)", letterSpacing: "0.14em" }}>
              Vous êtes propriétaire ?
            </p>
            <h2
              className="text-3xl lg:text-4xl font-normal mb-4 leading-snug"
              style={{ fontFamily: "var(--font-marcellus), serif", color: "#fff" }}
            >
              Confiez votre bien à HOOMY et vendez plus vite.
            </h2>
            <p className="text-sm lg:text-base leading-relaxed mb-8" style={{ color: "#A8D5B8" }}>
              Des milliers d&apos;acheteurs vérifiés recherchent un bien comme le vôtre. Mettez le
              vôtre en avant en quelques minutes — ou laissez-nous vous rappeler.
            </p>
          </div>

          {/* Avantages */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {AVANTAGES.map(({ titre, desc, Icone }) => (
              <div key={titre}>
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center mb-3"
                  style={{ background: "rgba(212,175,55,0.14)", border: "1px solid rgba(212,175,55,0.3)" }}
                >
                  <Icone />
                </div>
                <h3 className="text-base font-semibold mb-1.5" style={{ color: "#fff" }}>
                  {titre}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>

          {/* Double CTA : dépôt direct ou rappel conseiller */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              href="/publier"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold transition-transform hover:scale-[1.02]"
              style={{ background: "var(--accent)", color: "var(--primaire)", textDecoration: "none" }}
            >
              Déposer mon bien
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <a
              href="#contact-conseiller"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.35)", textDecoration: "none" }}
            >
              Être rappelé par un conseiller
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Icônes ──────────────────────────────────────────────────────────────────
function IcCadeau() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}
function IcConseiller() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IcDiffusion() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  );
}
function IcBouclier() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
