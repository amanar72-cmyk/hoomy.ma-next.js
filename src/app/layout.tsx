import type { Metadata } from "next";
import { Marcellus, Outfit } from "next/font/google";
import "./globals.css";

const marcellus = Marcellus({ subsets: ["latin"], weight: "400", variable: "--font-marcellus" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "HOOMY.MA — L'immobilier premium au Maroc",
  description: "Des biens vérifiés à Agadir, Marrakech, Casablanca et partout au Maroc.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body
        className={`${marcellus.variable} ${outfit.variable}`}
        style={{ margin: 0, fontFamily: "var(--font-outfit), sans-serif", background: "#FAF7F0", color: "#1f2a24" }}
      >
        {children}
      </body>
    </html>
  );
}