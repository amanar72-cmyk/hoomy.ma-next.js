import { LISTE_VILLES_ACTIVES } from "@/lib/villes";
import Link from "next/link";
import { FondZellige, SeparateurZellige } from "@/components/ui/MotifZellige";

const COLONNES = [
  {
    titre: "HOOMY.MA",
    liens: [
      { label: "À propos", href: "/a-propos" },
      { label: "Comment ça marche", href: "/comment-ca-marche" },
      { label: "Blog", href: "/blog" },
      { label: "Carrières", href: "/carrieres" },
    ],
  },
  {
    titre: "Découvrir",
    liens: [
      { label: "Acheter", href: "/acheter" },
      { label: "Louer", href: "/louer" },
      { label: "Programmes neufs", href: "/neuf" },
      { label: "Vendre mon bien", href: "/publier" },
    ],
  },
  {
    titre: "Villes",
    // Générée depuis les villes actives (src/lib/villes.ts)
    liens: LISTE_VILLES_ACTIVES.map((v) => ({
      label: v,
      href: `/acheter?ville=${encodeURIComponent(v)}`,
    })),
  },
  {
    titre: "Aide",
    liens: [
      { label: "Centre d'aide", href: "/aide" },
      { label: "Contact", href: "/contact" },
      { label: "Mentions légales", href: "/mentions-legales" },
      { label: "Confidentialité", href: "/confidentialite" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="pb-14 px-6 relative overflow-hidden" style={{ background: "var(--primaire)" }}>
      {/* Frise zellige en haut du footer — bande décorative répétée */}
      <div style={{ position: "relative", height: 44, overflow: "hidden", marginBottom: 40 }}>
        <FondZellige
          couleur="rgba(255,255,255,0.18)"
          opacite={1}
          taille={44}
          patternId="zellige-frise"
        />
      </div>

      <div className="max-w-6xl mx-auto relative">
        {/* 4 colonnes de liens */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {COLONNES.map((col) => (
            <div key={col.titre}>
              <p
                className="text-sm font-medium mb-4"
                style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--accent)" }}
              >
                {col.titre}
              </p>
              <ul className="space-y-2.5">
                {col.liens.map((lien) => (
                  <li key={lien.label}>
                    <Link
                      href={lien.href}
                      className="text-sm hover:opacity-80 transition-opacity"
                      style={{ color: "var(--texte-tertiaire)", textDecoration: "none" }}
                    >
                      {lien.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Séparateur zellige avant le copyright */}
        <SeparateurZellige
          couleur="rgba(255,255,255,0.35)"
          opacite={1}
          tailleEtoile={18}
          couleurLignes="rgba(255,255,255,0.1)"
        />

        {/* Copyright */}
        <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span
            style={{
              fontFamily: "var(--font-marcellus), serif",
              color: "var(--fond-secondaire)",
              fontSize: 20,
              letterSpacing: "0.12em",
            }}
          >
            HOOMY<span style={{ color: "var(--accent)" }}>.MA</span>
          </span>
          <p className="text-xs text-center" style={{ color: "var(--texte-tertiaire)" }}>
            © 2026 HOOMY.MA — L'immobilier premium au Maroc. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
