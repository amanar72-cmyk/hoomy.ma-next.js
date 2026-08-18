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
 * Trois responsabilités :
 *   1. signaler le contexte natif au CSS (marges d'encoche) ;
 *   2. habiller le système (barre d'état, écran de démarrage) ;
 *   3. brancher les notifications APNs — demande d'autorisation, enregistrement
 *      du jeton (APNs sur iOS, FCM sur Android), navigation au tap.
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
      // ── Habillage système ──────────────────────────────────────────────
      // Style.Dark = texte CLAIR (l'intitulé du plugin décrit le fond, pas le
      // texte). La barre supérieure du back-office est #111 : il faut du blanc.
      await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      await SplashScreen.hide().catch(() => {});

      // ── Notifications ──────────────────────────────────────────────────
      const jetonRecu = await PushNotifications.addListener("registration", async (jeton) => {
        try {
          const infos = await App.getInfo();
          // Détermine le service destinataire : Apple (APNs) ou Google (FCM).
          // Les deux jetons cohabitent dans la même table et ne sont pas
          // interchangeables — sans cette mention, chaque service recevrait
          // les jetons de l'autre et les rejetterait un par un.
          const plateforme = Capacitor.getPlatform() === "android" ? "android" : "ios";
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
        console.warn("[HOOMY PRO] APNs a refusé l'enregistrement :", err.error);
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
        // Déclenche APNs ; le jeton arrive dans l'écouteur « registration ».
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
