import Link from "next/link";

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
      { label: "Estimer mon bien", href: "/estimer" },
    ],
  },
  {
    titre: "Villes",
    liens: [
      { label: "Casablanca", href: "/acheter?ville=Casablanca" },
      { label: "Marrakech", href: "/acheter?ville=Marrakech" },
      { label: "Rabat", href: "/acheter?ville=Rabat" },
      { label: "Agadir", href: "/acheter?ville=Agadir" },
    ],
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
    <footer className="py-14 px-6" style={{ background: "#0F4C3A" }}>
      <div className="max-w-6xl mx-auto">
        {/* 4 colonnes de liens */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {COLONNES.map((col) => (
            <div key={col.titre}>
              <p
                className="text-sm font-medium mb-4"
                style={{ fontFamily: "var(--font-marcellus), serif", color: "#D4AF37" }}
              >
                {col.titre}
              </p>
              <ul className="space-y-2.5">
                {col.liens.map((lien) => (
                  <li key={lien.label}>
                    <Link
                      href={lien.href}
                      className="text-sm hover:opacity-80 transition-opacity"
                      style={{ color: "#9DB8AD", textDecoration: "none" }}
                    >
                      {lien.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Séparateur */}
        <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }} />

        {/* Copyright */}
        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <span
            style={{
              fontFamily: "var(--font-marcellus), serif",
              color: "#fff",
              fontSize: 20,
              letterSpacing: "0.12em",
            }}
          >
            HOOMY<span style={{ color: "#D4AF37" }}>.MA</span>
          </span>
          <p className="text-xs text-center" style={{ color: "#9DB8AD" }}>
            © 2026 HOOMY.MA — L'immobilier premium au Maroc. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
