import { ImageResponse } from 'next/og'

// Taille standard Apple touch icon
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// Fichier serveur pur — pas de "use client", pas d'export metadata ici
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: '#0F4C3A',
          borderRadius: 38,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Toit doré — SVG supporté par Satori */}
        <svg
          width="156"
          height="54"
          viewBox="0 0 156 54"
          style={{ display: 'block' }}
        >
          <path
            d="M 8 50 L 78 6 L 148 50"
            fill="none"
            stroke="#D4AF37"
            strokeWidth="15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Lettre H — trois blocs positionnés en absolu dans un conteneur relatif */}
        <div
          style={{
            display: 'flex',
            position: 'relative',
            width: 114,
            height: 70,
            marginTop: -6,
          }}
        >
          {/* Pilier gauche */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 26,
              height: 70,
              background: '#FAF7F0',
              borderRadius: 6,
            }}
          />
          {/* Pilier droit */}
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: 26,
              height: 70,
              background: '#FAF7F0',
              borderRadius: 6,
            }}
          />
          {/* Barre centrale */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 23,
              width: 114,
              height: 24,
              background: '#FAF7F0',
              borderRadius: 5,
            }}
          />
        </div>
      </div>
    ),
    { width: 180, height: 180 },
  )
}
