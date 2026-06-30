import type { Metadata } from "next";
import { Marcellus, Outfit } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import AnalytiqueGA from "@/components/AnalytiqueGA";
import BulleChatConditionnelle from "@/components/chat/BulleChatConditionnelle";
import { ComparateurProvider } from "@/lib/comparateur/ComparateurContext";
import BarreComparateur from "@/components/comparateur/BarreComparateur";
import SplashScreen from "@/components/ui/SplashScreen";

const marcellus = Marcellus({ subsets: ["latin"], weight: "400", variable: "--font-marcellus" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "HOOMY.MA — L'immobilier premium au Maroc",
  description:
    "Appartements, villas, riads et bureaux vérifiés à Casablanca, Marrakech, Rabat, Tanger, Agadir et Fès.",

  metadataBase: new URL("https://hoomy.ma"),

  verification: {
    google: "9lbPJsoQGI4dGxsXQXwOPW1ezTeENyAO9bVFT5FCB6I",
  },

  openGraph: {
    type: "website",
    locale: "fr_MA",
    url: "https://hoomy.ma",
    siteName: "HOOMY.MA",
    title: "HOOMY.MA — L'immobilier premium au Maroc",
    description:
      "Appartements, villas, riads et bureaux vérifiés à Casablanca, Marrakech, Rabat, Tanger, Agadir et Fès.",
  },

  twitter: {
    card: "summary_large_image",
    title: "HOOMY.MA — L'immobilier premium au Maroc",
    description:
      "Appartements, villas, riads et bureaux vérifiés à Casablanca, Marrakech, Rabat, Tanger, Agadir et Fès.",
  },
};

// Script inline exécuté AVANT le premier rendu pour éviter le flash de mauvais thème.
// Lit le cookie hoomy_theme ; si absent, respecte prefers-color-scheme.
const SCRIPT_ANTI_FLASH = `(function(){try{var c=document.cookie.match(/(?:^|; )hoomy_theme=([^;]*)/);var t=c?c[1]:null;if(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)t='dark';if(t==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}})()`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Lecture des cookies côté serveur — évite le flash de thème et le double splash
  const cookieStore = await cookies();
  const theme = cookieStore.get("hoomy_theme")?.value === "dark" ? "dark" : "light";
  const splashDeja = !!cookieStore.get("splash_vu")?.value;

  return (
    // suppressHydrationWarning : évite l'erreur React si le script inline
    // modifie data-theme avant hydratation (première visite dark mode système)
    <html lang="fr" data-theme={theme} suppressHydrationWarning>
      <head>
        {/* Anti-flash : s'exécute de façon synchrone avant tout rendu CSS */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_ANTI_FLASH }} />
        {/* Données structurées Schema.org — Organization + RealEstateAgent + WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": ["Organization", "RealEstateAgent"],
                  "@id": "https://hoomy.ma/#organization",
                  "name": "HOOMY",
                  "alternateName": "HOOMY.MA",
                  "url": "https://hoomy.ma",
                  "logo": {
                    "@type": "ImageObject",
                    "@id": "https://hoomy.ma/#logo",
                    "url": "https://hoomy.ma/api/logo",
                    "contentUrl": "https://hoomy.ma/api/logo",
                    "width": 600,
                    "height": 200,
                    "caption": "HOOMY",
                  },
                  "image": { "@id": "https://hoomy.ma/#logo" },
                  "description":
                    "Plateforme immobilière premium au Maroc — appartements, villas, riads et bureaux vérifiés à Casablanca, Marrakech, Rabat, Tanger, Agadir et Fès.",
                  "areaServed": { "@type": "Country", "name": "Maroc" },
                  "knowsLanguage": ["fr", "ar"],
                  "contactPoint": {
                    "@type": "ContactPoint",
                    "email": "contact@hoomy.ma",
                    "contactType": "customer service",
                    "availableLanguage": ["French", "Arabic"],
                  },
                },
                {
                  "@type": "WebSite",
                  "@id": "https://hoomy.ma/#website",
                  "url": "https://hoomy.ma",
                  "name": "HOOMY.MA",
                  "publisher": { "@id": "https://hoomy.ma/#organization" },
                  "inLanguage": "fr-MA",
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": {
                      "@type": "EntryPoint",
                      "urlTemplate": "https://hoomy.ma/acheter?q={search_term_string}",
                    },
                    "query-input": "required name=search_term_string",
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body
        className={`${marcellus.variable} ${outfit.variable}`}
        style={{ margin: 0, fontFamily: "var(--font-outfit), sans-serif", background: "var(--fond-principal)", color: "var(--texte-principal)" }}
      >
        <ComparateurProvider>
          {/* Splash affiché uniquement à la première visite de session (cookie "splash_vu" absent) */}
          <SplashScreen splashDeja={splashDeja} />
          {children}
          <BulleChatConditionnelle />
          {process.env.NEXT_PUBLIC_GA_ID && (
            <AnalytiqueGA gaId={process.env.NEXT_PUBLIC_GA_ID} />
          )}
          <BarreComparateur />
        </ComparateurProvider>
      </body>
    </html>
  );
}
