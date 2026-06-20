import type { Metadata } from "next";
import { Marcellus, Outfit } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import BulleChatConditionnelle from "@/components/chat/BulleChatConditionnelle";
import { ComparateurProvider } from "@/lib/comparateur/ComparateurContext";
import BarreComparateur from "@/components/comparateur/BarreComparateur";

const marcellus = Marcellus({ subsets: ["latin"], weight: "400", variable: "--font-marcellus" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "HOOMY.MA — L'immobilier premium au Maroc",
  description: "Des biens vérifiés à Agadir, Marrakech, Casablanca et partout au Maroc.",
};

// Script inline exécuté AVANT le premier rendu pour éviter le flash de mauvais thème.
// Lit le cookie hoomy_theme ; si absent, respecte prefers-color-scheme.
const SCRIPT_ANTI_FLASH = `(function(){try{var c=document.cookie.match(/(?:^|; )hoomy_theme=([^;]*)/);var t=c?c[1]:null;if(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)t='dark';if(t==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}})()`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Lecture du thème côté serveur — évite le flash pour les visites suivantes
  const cookieStore = await cookies();
  const theme = cookieStore.get("hoomy_theme")?.value === "dark" ? "dark" : "light";

  return (
    // suppressHydrationWarning : évite l'erreur React si le script inline
    // modifie data-theme avant hydratation (première visite dark mode système)
    <html lang="fr" data-theme={theme} suppressHydrationWarning>
      <head>
        {/* Anti-flash : s'exécute de façon synchrone avant tout rendu CSS */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_ANTI_FLASH }} />
      </head>
      <body
        className={`${marcellus.variable} ${outfit.variable}`}
        style={{ margin: 0, fontFamily: "var(--font-outfit), sans-serif", background: "var(--fond-principal)", color: "var(--texte-principal)" }}
      >
        <ComparateurProvider>
          {children}
          <BulleChatConditionnelle />
          <BarreComparateur />
        </ComparateurProvider>
      </body>
    </html>
  );
}
