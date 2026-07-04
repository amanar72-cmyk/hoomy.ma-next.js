import type { NextConfig } from "next";

// En-têtes de sécurité appliqués à toutes les routes.
// Choix volontairement conservateur : PAS de Content-Security-Policy stricte
// (elle casserait Mapbox / Google Analytics / Supabase / le script anti-flash).
// On garde le upgrade-insecure-requests fourni par l'hébergeur.
const enTetesSecurite = [
  // Force HTTPS pendant 2 ans (préchargeable dans les navigateurs)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Anti-clickjacking : le site ne peut être mis en iframe que par lui-même
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Empêche le navigateur de « deviner » le type MIME d'une ressource
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Ne divulgue l'URL de provenance qu'en interne, l'origine seule en externe
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Coupe les API sensibles ; geolocation=(self) → la carte garde la géoloc
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],

  // Masque l'en-tête « x-powered-by: Next.js » (moins d'info donnée aux attaquants)
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: enTetesSecurite,
      },
    ];
  },
};

export default nextConfig;
