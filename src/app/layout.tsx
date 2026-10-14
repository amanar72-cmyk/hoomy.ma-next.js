import { LIBELLE_VILLES_ACTIVES } from "@/lib/villes";
import type { Metadata } from "next";
import { Marcellus, Outfit } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import Analytique from "@/components/analytique/Analytique";
import { COOKIE_CONSENTEMENT, estConsentementValide } from "@/lib/consentement";
import { estSitePublic } from "@/lib/hote";
import BulleChatConditionnelle from "@/components/chat/BulleChatConditionnelle";
import { ComparateurProvider } from "@/lib/comparateur/ComparateurContext";
import BarreComparateur from "@/components/comparateur/BarreComparateur";
import SplashScreen from "@/components/ui/SplashScreen";
import Toaster from "@/components/ui/Toaster";

const marcellus = Marcellus({ subsets: ["latin"], weight: "400", variable: "--font-marcellus" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "HOOMY.MA — L'immobilier premium au Maroc",
  description:
    `Appartements, villas, riads et bureaux vérifiés à ${LIBELLE_VILLES_ACTIVES}.`,

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
      `Appartements, villas, riads et bureaux vérifiés à ${LIBELLE_VILLES_ACTIVES}.`,
    // og:image par défaut : géré par la convention fichier src/app/opengraph-image.tsx
    // (1200×630, dégradé Vert Royal + logo) pour toutes les pages sans OG propre.
    // Les fiches biens définissent leur propre carte via /api/og.
  },

  twitter: {
    card: "summary_large_image",
    title: "HOOMY.MA — L'immobilier premium au Maroc",
    description:
      `Appartements, villas, riads et bureaux vérifiés à ${LIBELLE_VILLES_ACTIVES}.`,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Lecture des cookies côté serveur — évite le double splash
  const cookieStore = await cookies();
  const splashDeja = !!cookieStore.get("splash_vu")?.value;

  // Mesure d'audience : uniquement sur le site public, uniquement après accord.
  const consentementBrut = cookieStore.get(COOKIE_CONSENTEMENT)?.value;
  const consentement = estConsentementValide(consentementBrut) ? consentementBrut : null;
  const sitePublic = await estSitePublic();

  return (
    // Mode sombre supprimé (octobre 2026) : le site est toujours en thème clair,
    // quel que soit le réglage du téléphone ou un ancien cookie hoomy_theme.
    <html lang="fr" data-theme="light">
      <head>
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
                    `Plateforme immobilière premium au Maroc — appartements, villas, riads et bureaux vérifiés à ${LIBELLE_VILLES_ACTIVES}.`,
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
          <Analytique
            gaId={process.env.NEXT_PUBLIC_GA_ID}
            metaPixelId={process.env.NEXT_PUBLIC_META_PIXEL_ID}
            estSitePublic={sitePublic}
            consentementInitial={consentement}
          />
          <BarreComparateur />
          <Toaster />
        </ComparateurProvider>
      </body>
    </html>
  );
}
