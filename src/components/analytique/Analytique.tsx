"use client";

import { Suspense, useState } from "react";
import { usePathname } from "next/navigation";
import { ecrireConsentement, type Consentement } from "@/lib/consentement";
import BandeauConsentement from "./BandeauConsentement";
import ScriptsTracking from "./ScriptsTracking";

interface Props {
  gaId?: string;
  metaPixelId?: string;
  /** Calculé côté serveur depuis le hostname : faux sur pro.hoomy.ma. */
  estSitePublic: boolean;
  /** Lu dans le cookie côté serveur → pas de bandeau qui clignote au chargement. */
  consentementInitial: Consentement | null;
}

export default function Analytique({
  gaId,
  metaPixelId,
  estSitePublic,
  consentementInitial,
}: Props) {
  const [consentement, setConsentement] = useState<Consentement | null>(consentementInitial);
  const pathname = usePathname();

  // Le filtre hostname couvre la prod ; celui-ci couvre le dev local, où /pro et
  // /admin sont servis depuis localhost et non depuis un sous-domaine pro.
  const estBackOffice = pathname.startsWith("/pro") || pathname.startsWith("/admin");
  if (!estSitePublic || estBackOffice) return null;

  // Aucun identifiant configuré : rien à charger, donc rien à demander.
  if (!gaId && !metaPixelId) return null;

  function choisir(valeur: Consentement) {
    ecrireConsentement(valeur);
    setConsentement(valeur);
  }

  return (
    <>
      {/* Le refus ne monte jamais ScriptsTracking : aucun script, aucun cookie. */}
      {consentement === "accepte" && (
        // ScriptsTracking lit useSearchParams — sans cette frontière, les pages
        // statiques basculeraient en rendu client au build.
        <Suspense fallback={null}>
          <ScriptsTracking gaId={gaId} metaPixelId={metaPixelId} />
        </Suspense>
      )}

      {consentement === null && <BandeauConsentement onChoix={choisir} />}
    </>
  );
}
