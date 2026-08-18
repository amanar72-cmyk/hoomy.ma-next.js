"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { PushNotifications } from "@capacitor/push-notifications";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { estAppNative } from "@/lib/mobile/natif";
import { enregistrerAppareilPush } from "@/app/pro/push/actions";

/**
 * Pont entre le back-office web et les coques natives iOS et Android (Capacitor).
 *
 * Ne rend rien. Monté dans le gabarit /pro, il ne s'active QUE dans
 * l'application native : dans un navigateur ordinaire, tout le corps de l'effet
 * est court-circuité dès la première ligne.
 *
 * Quatre responsabilités :
 *   1. signaler le contexte natif au CSS (marges d'encoche) ;
 *   2. habiller le système (barre d'état, écran de démarrage) ;
 *   3. brancher les notifications — demande d'autorisation, enregistrement du
 *      jeton (APNs sur iOS, FCM sur Android), navigation au tap ;
 *   4. rendre au bouton retour Android son comportement attendu.
 */
export default function PontNatif() {
  const router = useRouter();

  useEffect(() => {
    if (!estAppNative()) return;

    // Marqueur lu par globals.css : active les marges de zone sûre (encoche,
    // Dynamic Island, barre d'accueil) sur le chrome du back-office.
    document.documentElement.dataset.appNatif = "1";

    // Les écouteurs sont asynchrones à poser ; on les collecte pour pouvoir
    // tous les retirer au démontage.
    const aRetirer: { remove: () => Promise<void> }[] = [];
    let annule = false;

    async function demarrer() {
      const plateforme = Capacitor.getPlatform() === "android" ? "android" : "ios";

      // ── Habillage système ──────────────────────────────────────────────
      // Style.Dark = texte CLAIR (l'intitulé du plugin décrit le fond, pas le
      // texte). La barre supérieure du back-office est #111 : il faut du blanc.
      await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});

      if (plateforme === "android") {
        // Android 15+ impose le bord-à-bord : la WebView passe DÉJÀ sous la
        // barre d'état. On le déclare explicitement pour que les marges de zone
        // sûre du CSS soient calculées sur la bonne hauteur, et on rend la
        // barre transparente pour que le #111 du back-office la remplisse.
        await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      }

      await SplashScreen.hide().catch(() => {});

      // ── Bouton retour physique (Android) ───────────────────────────────
      // Sans écouteur, Android FERME l'application au premier appui sur retour,
      // même au milieu d'un formulaire — le comportement par défaut de
      // Capacitor. On rétablit l'usage attendu : revenir en arrière dans la
      // navigation, et seulement à la racine mettre l'app en arrière-plan
      // (comme le bouton accueil) plutôt que de la tuer.
      if (plateforme === "android") {
        const retour = await App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            App.minimizeApp().catch(() => {});
          }
        });
        aRetirer.push(retour);
      }

      // ── Notifications ──────────────────────────────────────────────────
      const jetonRecu = await PushNotifications.addListener("registration", async (jeton) => {
        try {
          const infos = await App.getInfo();
          // « plateforme » aiguille le jeton vers le bon service : Apple (APNs)
          // ou Google (FCM). Les deux cohabitent dans la même table et ne sont
          // pas interchangeables — sans cette mention, chaque service recevrait
          // les jetons de l'autre et les rejetterait un par un.
          await enregistrerAppareilPush({
            jeton: jeton.value,
            plateforme,
            modele: plateforme,
            versionApp: infos.version,
          });
        } catch (err) {
          // Échec d'enregistrement : l'agent perd ses notifications, pas sa
          // session. On journalise sans interrompre l'usage de l'app.
          console.warn("[HOOMY PRO] Jeton push non enregistré :", err);
        }
      });
      aRetirer.push(jetonRecu);

      const erreurJeton = await PushNotifications.addListener("registrationError", (err) => {
        const service = plateforme === "android" ? "FCM" : "APNs";
        console.warn(`[HOOMY PRO] ${service} a refusé l'enregistrement :`, err.error);
      });
      aRetirer.push(erreurJeton);

      // Tap sur une notification → ouverture directe du bon écran.
      const tap = await PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (action) => {
          const cible = action.notification.data?.url;
          if (typeof cible === "string" && cible.startsWith("/")) {
            router.push(cible);
          }
        },
      );
      aRetirer.push(tap);

      // L'autorisation n'est demandée que si elle n'a jamais été accordée.
      // iOS ne montre la fenêtre système qu'une fois : la redemander en boucle
      // n'a aucun effet, autant ne pas insister.
      const etat = await PushNotifications.checkPermissions();
      const accord =
        etat.receive === "granted"
          ? etat
          : etat.receive === "prompt" || etat.receive === "prompt-with-rationale"
            ? await PushNotifications.requestPermissions()
            : etat;

      if (accord.receive === "granted" && !annule) {
        // Déclenche l'enregistrement ; le jeton arrive dans « registration ».
        await PushNotifications.register();
      }

    }

    demarrer().catch((err) => console.warn("[HOOMY PRO] Pont natif :", err));

    return () => {
      annule = true;
      aRetirer.forEach((ecouteur) => {
        ecouteur.remove().catch(() => {});
      });
    };
  }, [router]);

  return null;
}
