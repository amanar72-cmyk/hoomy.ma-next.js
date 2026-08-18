# HOOMY PRO — application Android

Même coque Capacitor que l'app iOS : l'écran affiche `pro.hoomy.ma`, le natif
apporte notifications, appareil photo et position.

**L'APK signé est déjà compilé.** Contrairement à iOS, tout se fait sans licence
ni matériel Apple.

---

## 1. Envoyer le lien — c'est déjà en ligne

L'APK est hébergé sur votre Supabase Storage (bucket public `applications`) :

```
https://lknclszligkdlwhhhcqn.supabase.co/storage/v1/object/public/applications/hoomy-pro-1.0.apk
```

Ce lien fonctionne tel quel, mais on n'envoie pas une URL Supabase à un agent.
Une page dédiée existe : **`/telecharger`**, soit `https://hoomy.ma/telecharger`
une fois le site déployé. Elle présente l'app, le bouton de téléchargement, les
quatre étapes d'installation et l'empreinte du fichier.

C'est **cette adresse** que vous envoyez par WhatsApp ou par email.

### Publier une nouvelle version

```bash
npm run android:apk        # produit l'APK signé
```

Déposez le fichier dans le bucket `applications` depuis le tableau de bord
Supabase (Storage → applications → Upload), sous un nom versionné
(`hoomy-pro-1.1.apk`), puis mettez à jour la variable d'environnement :

```bash
NEXT_PUBLIC_URL_APK=https://…/applications/hoomy-pro-1.1.apk
```

Pensez à incrémenter `versionCode` **avant** de compiler (voir §5), sinon
Android refusera silencieusement la mise à jour.

> Retirer la diffusion : supprimez le fichier du bucket, ou passez le bucket en
> privé depuis le tableau de bord Supabase.

---

## 2. Les voies de publication

Google Play coûte **25 $ une seule fois** (pas d'abonnement). Ce n'est pas
gratuit, mais c'est quatre fois moins que la seule première année d'Apple, et à
vie. Cela dit, pour une app réservée à vos agents, il n'apporte pas grand-chose.

| Voie | Coût | Mise à jour auto | Pertinence ici |
|---|---|---|---|
| **APK depuis hoomy.ma** | 0 € | non | ★★★ En place |
| Samsung Galaxy Store | 0 € | oui | ★★ Si vos agents sont sur Samsung |
| Huawei AppGallery | 0 € | oui | ★★ Utile sur les Huawei récents |
| Amazon Appstore | 0 € | oui | ★ Peu utilisé au Maroc |
| Google Play | 25 $ une fois | oui | ★★★ Si vous visez large un jour |

### Pourquoi l'APK direct suffit

L'app est une coque : **l'interface vient du serveur**. Corriger le back-office
ne demande aucune réinstallation — vous déployez sur Hostinger, les agents
voient le changement immédiatement. Un nouvel APK n'est nécessaire que pour
toucher au natif, soit quelques fois par an. L'absence de mise à jour
automatique, principal défaut de cette voie, ne pèse donc presque rien.

### Ce que l'agent fait, une fois

Android bloque par défaut les apps hors Play Store :

1. Ouvrir le lien dans **Chrome**. À l'avertissement « Ce type de fichier peut
   endommager votre appareil », choisir **Télécharger quand même**.
2. Ouvrir le fichier téléchargé. Android propose d'autoriser Chrome à installer
   des applications : **activer l'autorisation**, puis revenir.
3. Play Protect affiche « Application non reconnue » : **Installer quand même**.
   L'avertissement vient de l'absence de signature Play, pas d'un problème réel.

---

## 3. Passer par le Play Store

### Le choix qui engage tout : type de compte

À la création du compte (25 $), Google demande **personnel ou organisation**.
Ce choix est structurant et difficile à revenir dessus :

| | Compte personnel | Compte organisation |
|---|---|---|
| Justificatifs | Pièce d'identité | Numéro **D-U-N-S** (gratuit, 1 à 2 semaines) |
| Test obligatoire avant production | **12 testeurs pendant 14 jours consécutifs** | Aucun |
| Nom affiché sur la fiche | Votre nom | HOOMY |

Pour une entreprise, **le compte organisation s'impose** : il affiche HOOMY
comme éditeur et évite la contrainte des 12 testeurs, qui bloque littéralement
la publication pendant deux semaines. Demandez le numéro D-U-N-S à l'avance,
c'est le seul élément à délai.

### Ce qu'on envoie

Le Play Store n'accepte plus d'APK pour une nouvelle application : il faut un
**AAB** (Android App Bundle), déjà compilé :

```bash
npm run android:aab   # → android/app/build/outputs/bundle/release/app-release.aab
```

Google re-signe ensuite l'app avec sa propre clé (**Play App Signing**). Votre
keystore devient une simple « clé d'envoi » — et, contrairement à la diffusion
directe, Google peut la réinitialiser si vous la perdez. C'est le seul avantage
réel du Play Store sur ce point.

### Visuels de fiche

Déjà générés dans `docs/play-store/` :

- `icone-512.png` — icône de la fiche, 512×512, sans transparence
- `banniere-1024x500.png` — bandeau de tête

Il manque **au moins deux captures d'écran** de l'app en fonctionnement
(téléphone, format portrait). Prenez-les depuis un vrai appareil une fois l'app
installée.

### Le circuit, dans l'ordre

1. Créer le compte sur [play.google.com/console](https://play.google.com/console) — 25 $.
2. Créer l'application : nom, langue par défaut (français), gratuite.
3. Remplir la fiche : description, icône, bannière, captures.
4. Répondre aux **trois questionnaires obligatoires** — sécurité des données
   (l'app collecte email et position), classification du contenu, public cible.
5. Fournir une **URL de politique de confidentialité** :
   `https://hoomy.ma/confidentialite` existe déjà.
6. Envoyer l'AAB sur le circuit **test interne** : jusqu'à 100 testeurs, **aucune
   relecture**, disponible en quelques minutes. Google fournit un lien d'adhésion
   à partager — c'est la voie la plus rapide pour équiper vos agents via Play.
7. Passer en production quand vous le souhaitez. Comptez de quelques jours à
   deux semaines de relecture pour une première publication.

> **Restreindre l'accès.** Une app d'agents n'a rien à faire en accès public.
> Restez sur le circuit **test interne** ou **test fermé** : seuls les comptes
> Google que vous listez peuvent l'installer. C'est gratuit et illimité dans le
> temps.

---

## 4. Notifications push (gratuit)

Android passe par **Firebase Cloud Messaging**, gratuit et sans plafond réaliste
pour votre usage.

1. Créer un projet sur [console.firebase.google.com](https://console.firebase.google.com)
   (offre Spark, gratuite).
2. Ajouter une application Android avec le nom de package **`ma.hoomy.pro`**.
3. Télécharger `google-services.json` et le déposer dans **`android/app/`**.
   Le branchement Gradle est déjà conditionnel : le fichier présent, Firebase
   s'active ; absent, l'app compile quand même, simplement sans push.
4. Dans Paramètres du projet → Comptes de service → **Générer une nouvelle clé
   privée**. Un fichier JSON est téléchargé.

Variables à poser sur Hostinger, tirées de ce JSON :

```bash
FCM_PROJECT_ID=hoomy-pro-xxxxx        # champ "project_id"
FCM_CLIENT_EMAIL=firebase-adminsdk-...@....iam.gserviceaccount.com
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE…\n-----END PRIVATE KEY-----"
```

Comme pour APNs : tant qu'elles manquent, rien ne casse — le canal Android reste
simplement muet.

> Ne commitez jamais `google-services.json` ni la clé de compte de service.

---

## 5. Recompiler

```bash
npm run android:sync   # après toute modif de capacitor.config.ts ou mobile/www/
npm run android:apk    # APK signé → android/app/build/outputs/apk/release/
npm run android:aab    # AAB, uniquement si vous passez par le Play Store
```

La compilation exige le SDK Android et un **JDK 21** (Java 25 ne convient pas) :

```bash
export ANDROID_HOME="$HOME/android-sdk"
export JAVA_HOME=/usr/local/sdkman/candidates/java/21.0.10-ms
```

Le fichier `codemagic.yaml` contient aussi un workflow `android-apk` : un tag
`android-v1.0.1` suffit à produire l'APK dans le cloud, sans SDK local.

### Avant chaque nouvelle version

Incrémentez **`versionCode`** dans `android/app/build.gradle`. Android refuse
d'installer une mise à jour dont le `versionCode` n'est pas supérieur à
l'existant — c'est l'erreur la plus fréquente et elle est silencieuse côté
utilisateur.

---

## 6. Le magasin de clés — à ne pas perdre

La signature de production vit dans deux fichiers **volontairement hors dépôt** :

```
android/hoomy-pro.keystore      ← la clé (RSA 4096, valable 27 ans)
android/keystore.properties     ← les mots de passe
```

**Sauvegardez-les ailleurs que sur cette machine, dès aujourd'hui.** Android
refuse toute mise à jour signée par une clé différente : les perdre obligerait
chaque agent à désinstaller puis réinstaller l'app, et interdirait définitivement
la mise à jour d'une version publiée sur le Play Store.

Un gestionnaire de mots de passe ou un coffre chiffré convient. Pas le dépôt
git, pas un email.

---

## 7. Points de vigilance

- **Bord-à-bord.** Le `targetSdk` est 36 : depuis Android 15, l'app dessine sous
  les barres système et Android 16 ignore toute dérogation. Le thème est
  configuré pour que la WebView remonte de vraies valeurs dans
  `env(safe-area-inset-*)`, que le CSS du back-office consomme déjà. **À vérifier
  sur un vrai téléphone** — c'est le seul point que je n'ai pas pu tester ici.
- **Android 13+** demande l'autorisation des notifications à l'utilisateur,
  exactement comme iOS. Le pont natif s'en charge.
- **minSdk 24** (Android 7.0, 2016) : couvre plus de 98 % du parc.
