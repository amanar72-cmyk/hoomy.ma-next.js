import Link from "next/link";

// Double parcours acheteur / vendeur — deux grandes portes d'entrée juste
// après le hero. 100 % CSS : liseré Or qui se dessine au survol, élévation
// douce, micro-décalage de l'icône. Aucune dépendance JS.

function IcAcheter() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IcVendre() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2 20 22 20" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="18" y1="20" x2="18" y2="10" />
    </svg>
  );
}

const PARCOURS = [
  {
    href: "/acheter",
    Icone: IcAcheter,
    surtitre: "Vous cherchez",
    titre: "Acheter ou louer",
    desc: "Parcourez des biens vérifiés dans toutes les grandes villes du Royaume, avec localisation protégée.",
    cta: "Voir les biens",
  },
  {
    href: "/estimer",
    Icone: IcVendre,
    surtitre: "Vous possédez",
    titre: "Vendre mon bien",
    desc: "Estimez gratuitement la valeur de votre bien et confiez sa vente à un conseiller dédié.",
    cta: "Estimer mon bien",
  },
] as const;

export default function DoubleParcours() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-14 md:py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {PARCOURS.map(({ href, Icone, surtitre, titre, desc, cta }) => (
          <Link key={href} href={href} className="parcours-carte group" style={{ textDecoration: "none" }}>
            <div className="parcours-icone">
              <Icone />
            </div>
            <p className="text-xs font-medium tracking-widest uppercase mb-1.5" style={{ color: "var(--accent)", letterSpacing: "0.14em" }}>
              {surtitre}
            </p>
            <h2 className="text-2xl font-normal mb-2" style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}>
              {titre}
            </h2>
            <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--texte-secondaire)" }}>
              {desc}
            </p>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--primaire)" }}>
              {cta}
              <svg className="parcours-fleche" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
