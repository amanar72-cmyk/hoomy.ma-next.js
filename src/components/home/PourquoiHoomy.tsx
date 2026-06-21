import { FondZellige } from "@/components/ui/MotifZellige";

function IconVerifie() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconConseillers() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconSecurise() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

const POINTS = [
  {
    Icone: IconVerifie,
    titre: "Annonces Vérifiées",
    description:
      "Chaque bien est contrôlé par notre équipe terrain. Zéro fausse annonce, photos authentiques et informations exactes.",
  },
  {
    Icone: IconConseillers,
    titre: "Conseillers Experts",
    description:
      "Des professionnels immobiliers dédiés à votre projet, disponibles 6j/7 pour vous guider de A à Z.",
  },
  {
    Icone: IconSecurise,
    titre: "100% Sécurisé",
    description:
      "Transactions sécurisées, données protégées et processus conformes à la législation marocaine en vigueur.",
  },
];

export default function PourquoiHoomy() {
  return (
    <section className="py-16 px-6 relative overflow-hidden" style={{ background: "var(--primaire)" }}>
      {/* Texture zellige en filigrane — blanc pur à 8 % pour fonctionner sur fond vert ET or (mode nuit) */}
      <FondZellige
        couleur="rgba(255,255,255,0.08)"
        opacite={1}
        taille={78}
        patternId="zellige-pourquoi"
      />
      <div className="max-w-6xl mx-auto relative">
        <h2
          className="text-3xl font-normal text-center mb-3"
          style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--fond-secondaire)" }}
        >
          Pourquoi choisir HOOMY.MA ?
        </h2>
        <p className="text-center text-sm mb-14" style={{ color: "var(--texte-tertiaire)" }}>
          La plateforme immobilière de confiance au Maroc.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {POINTS.map(({ Icone, titre, description }) => (
            <div key={titre} className="text-center">
              <div className="flex justify-center mb-6">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.25)" }}
                >
                  <Icone />
                </div>
              </div>
              <h3
                className="text-xl font-normal mb-3"
                style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--fond-secondaire)" }}
              >
                {titre}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--texte-tertiaire)" }}>
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
