import type { CapacitorConfig } from "@capacitor/cli";

// ─────────────────────────────────────────────────────────────────────────────
// HOOMY PRO — configuration de la coque iOS (Capacitor)
//
// Le back-office est une application Next.js rendue CÔTÉ SERVEUR (middleware,
// Server Actions, client Supabase serveur). Elle ne peut donc pas être exportée
// en fichiers statiques et embarquée dans le binaire : la WebView charge le site
// live sur `pro.hoomy.ma`.
//
// `webDir` ne contient donc PAS l'application : uniquement la page de repli
// affichée quand le téléphone n'a pas de réseau (voir server.errorPath).
// ─────────────────────────────────────────────────────────────────────────────

// URL chargée par la WebView. Surchargeable pour tester une préproduction ou un
// tunnel local (ex. HOOMY_APP_URL=https://xxxx.trycloudflare.com npx cap sync ios).
const URL_APPLICATION = process.env.HOOMY_APP_URL ?? "https://pro.hoomy.ma";

const config: CapacitorConfig = {
  appId: "ma.hoomy.pro",
  appName: "HOOMY PRO",
  webDir: "mobile/www",

  server: {
    url: URL_APPLICATION,
    // Aucun trafic en clair : tout passe par HTTPS.
    cleartext: false,
    // Domaines autorisés à s'ouvrir DANS la WebView. Tout le reste (liens
    // externes, tel:, mailto:) part vers Safari ou l'app système.
    // Supabase est indispensable : le callback d'authentification y transite.
    allowNavigation: [
      "pro.hoomy.ma",
      "hoomy.ma",
      "www.hoomy.ma",
      "*.supabase.co",
    ],
    // Page servie depuis le bundle local quand le serveur est injoignable.
    errorPath: "hors-ligne.html",
  },

  // Signature ajoutée au User-Agent. C'est le marqueur qui permet au site de
  // savoir qu'il tourne dans l'app native — lisible côté client ET côté serveur
  // (en-tête HTTP), donc utilisable jusque dans les Server Components.
  appendUserAgent: "HoomyProApp/1.0",

  ios: {
    // Les encoches et l'indicateur d'accueil sont gérés en CSS via env(safe-area-*)
    // dans le site lui-même : on demande à iOS de ne rien ajuster tout seul,
    // sinon les marges se cumulent et l'en-tête se retrouve décalé.
    contentInset: "never",
    scrollEnabled: true,
    // Même couleur que le splash et le manifeste PWA : pas de flash blanc.
    backgroundColor: "#111111",
    // Le back-office n'est pas conçu pour être zoomé au pincement.
    zoomEnabled: false,
    // Un appui long sur un lien ne doit pas ouvrir l'aperçu Safari.
    allowsLinkPreview: false,
    preferredContentMode: "mobile",
    // À laisser sur `false` : passer à `true` impose de déclarer WKAppBoundDomains
    // dans Info.plist, ce qui plafonne à 10 domaines et casse les redirections
    // d'authentification Supabase.
    limitsNavigationsToAppBoundDomains: false,
    // Capacitor prend la main sur les notifications APNs (jeton, réception).
    handleApplicationNotifications: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#111111",
      showSpinner: false,
      iosSpinnerStyle: "small",
      splashFullScreen: true,
      splashImmersive: false,
    },
    PushNotifications: {
      // Bannière + son + pastille même quand l'app est au premier plan.
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
