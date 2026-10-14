"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

interface Props {
  gaId?: string;
  metaPixelId?: string;
}

/**
 * Ce composant n'est monté QU'APRÈS consentement explicite : c'est son montage
 * qui déclenche le chargement des scripts, donc aucun cookie de mesure n'est
 * déposé avant. Ne jamais le rendre inconditionnellement.
 *
 * Le premier page_view est envoyé par les scripts d'init ci-dessous (au moment
 * où l'URL et le titre sont déjà bons), pas par l'effet : à l'exécution de
 * l'effet, gtag/fbq ne sont pas encore chargés et l'événement serait perdu.
 * L'effet ne prend donc le relais qu'à partir de la 2ᵉ vue.
 */
export default function ScriptsTracking({ gaId, metaPixelId }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const premierRendu = useRef(true);

  useEffect(() => {
    if (premierRendu.current) {
      premierRendu.current = false;
      return;
    }

    const requete = searchParams.toString();
    const url = pathname + (requete ? `?${requete}` : "");

    // page_location reconstruite depuis pathname + search : le fragment (#...)
    // est volontairement exclu, il n'a rien à faire chez Google.
    window.gtag?.("event", "page_view", {
      page_location: window.location.origin + url,
      page_title: document.title,
    });

    window.fbq?.("track", "PageView");
  }, [pathname, searchParams]);

  return (
    <>
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}', { send_page_view: false });
              gtag('event', 'page_view', {
                page_location: location.origin + location.pathname + location.search
              });
            `}
          </Script>
        </>
      )}

      {/* autoConfig=false coupe la « correspondance avancée automatique » de Meta,
          qui lit sinon les champs des formulaires de la page (email, téléphone sur
          /contact, /publier, /mon-compte) pour les envoyer à Meta. À désactiver
          AUSSI dans Events Manager : le code ne couvre que la moitié du réglage. */}
      {metaPixelId && (
        <Script id="meta-pixel-init" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
            document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('set', 'autoConfig', false, '${metaPixelId}');
            fbq('init', '${metaPixelId}');
            fbq('track', 'PageView');
            // Événements émis avant le chargement du pixel (ViewContent d'une
            // fiche, Lead) : file remplie par trackMeta (src/lib/meta/pixel.ts).
            var fileMeta = window.__fileMeta || [];
            window.__fileMeta = [];
            for (var i = 0; i < fileMeta.length; i++) {
              fbq('track', fileMeta[i][0], fileMeta[i][1]);
            }
          `}
        </Script>
      )}
    </>
  );
}
