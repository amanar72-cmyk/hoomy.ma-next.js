'use client'

import { useEffect, useState } from 'react'

// Délai avant le début du fondu de sortie (ms)
const DELAI_SORTIE = 1500
// Durée du fondu de sortie (ms)
const DUREE_FONDU = 350

// Cookie de session : sans expires → supprimé à la fermeture du navigateur
function poserCookieSession(nom: string): void {
  document.cookie = `${nom}=1; path=/; SameSite=Lax`
}

interface SplashScreenProps {
  splashDeja: boolean
}

export default function SplashScreen({ splashDeja }: SplashScreenProps) {
  // Initialisé côté serveur ET client à partir de la prop → pas de désaccord d'hydratation
  const [visible, setVisible] = useState(!splashDeja)
  const [sortie, setSortie] = useState(false)

  useEffect(() => {
    if (splashDeja) return

    // Cookie posé immédiatement — évite un double affichage si navigation rapide
    poserCookieSession('splash_vu')

    const reduire = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Moins d'animations demandé → logo statique 300 ms puis disparition
    const delaiEffectif = reduire ? 300 : DELAI_SORTIE

    const tSortie = setTimeout(() => {
      setSortie(true)
      // Retrait complet après la transition CSS
      setTimeout(() => setVisible(false), DUREE_FONDU)
    }, delaiEffectif)

    return () => clearTimeout(tSortie)
  }, [splashDeja])

  if (!visible) return null

  return (
    <>
      {/*
        Keyframes inlines : évite tout fichier CSS externe tout en permettant
        l'animation stroke-dashoffset et les opacités séquencées.
        Nommage préfixé "hoomy-splash-" pour éviter les collisions.
      */}
      <style>{`
        @keyframes hoomy-splash-toit {
          from { stroke-dashoffset: 300; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes hoomy-splash-mot {
          from { opacity: 0; transform: translateY(7px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hoomy-splash-ma {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        /* Tracé du toit : 0,15 s de pause → 0,55 s de dessin */
        .hoomy-splash-toit {
          stroke-dasharray: 300;
          stroke-dashoffset: 300;
          animation: hoomy-splash-toit 0.55s cubic-bezier(0.4, 0, 0.2, 1) 0.15s forwards;
        }
        /* "HOOMY" apparaît pendant que le toit finit de se dessiner */
        .hoomy-splash-mot {
          opacity: 0;
          animation: hoomy-splash-mot 0.5s ease-out 0.52s forwards;
        }
        /* ".MA" en gold arrive juste après */
        .hoomy-splash-ma {
          opacity: 0;
          animation: hoomy-splash-ma 0.4s ease-out 0.88s forwards;
        }

        /* Respect de prefers-reduced-motion : logo statique, zéro animation */
        @media (prefers-reduced-motion: reduce) {
          .hoomy-splash-toit { animation: none; stroke-dashoffset: 0; }
          .hoomy-splash-mot  { animation: none; opacity: 1; transform: none; }
          .hoomy-splash-ma   { animation: none; opacity: 1; }
        }
      `}</style>

      {/*
        Overlay plein écran.
        - pointerEvents: none → le contenu derrière reste interactif (SEO, chargement)
        - aria-hidden → non annoncé par les lecteurs d'écran
        - zIndex 9999 → passe au-dessus de tout
      */}
      <div
        role="presentation"
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg, #0a2418 0%, #0F4C3A 100%)',
          opacity: sortie ? 0 : 1,
          transition: sortie ? `opacity ${DUREE_FONDU}ms ease-out` : 'none',
          pointerEvents: 'none',
        }}
      >
        <div style={{ position: 'relative', textAlign: 'center' }}>

          {/*
            SVG du toit doré tracé progressivement.
            Chemin : triangle/chevron de (18,44) → sommet (88,6) → (202,44)
            Longueur de chemin ≈ 182 px → dasharray 300 assure un départ invisible.
            Le toit est centré au-dessus des "OO" de HOOMY.
          */}
          <svg
            width="248"
            height="48"
            viewBox="0 0 248 48"
            fill="none"
            aria-hidden="true"
            style={{ display: 'block', margin: '0 auto -3px' }}
          >
            <path
              className="hoomy-splash-toit"
              d="M 18 44 L 88 6 L 202 44"
              stroke="#D4AF37"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* Logo texte HOOMY.MA */}
          <div
            style={{
              fontFamily: 'var(--font-marcellus), "Times New Roman", serif',
              fontSize: 'clamp(2.4rem, 7.5vw, 3.75rem)',
              letterSpacing: '0.1em',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'center',
            }}
          >
            <span className="hoomy-splash-mot" style={{ color: '#FAF7F0' }}>
              HOOMY
            </span>
            <span className="hoomy-splash-ma" style={{ color: '#D4AF37' }}>
              .MA
            </span>
          </div>

        </div>
      </div>
    </>
  )
}
