# HOOMY PRO — application iOS

Application iOS de l'espace professionnel, construite avec **Capacitor**.

---

## 1. Comment ça marche

L'app **n'est pas une réécriture** du back-office : c'est une coque native qui
affiche `https://pro.hoomy.ma` dans une WebView plein écran, augmentée de
fonctions réellement natives (notifications APNs, appareil photo, position,
partage, retour haptique).

```
┌─────────────────────────────┐
│  App HOOMY PRO (App Store)  │
│  ┌───────────────────────┐  │
│  │  WKWebView            │  │──── HTTPS ───▶  pro.hoomy.ma
│  │  → pro.hoomy.ma       │  │                 (Next.js, Hostinger)
│  └───────────────────────┘  │
│  + APNs, caméra, GPS…       │◀─── APNs ─────  Serveur HOOMY
└─────────────────────────────┘
```

**Conséquence majeure :** corriger le back-office ne demande **aucune** mise à
jour de l'app. Vous déployez sur Hostinger comme d'habitude, les agents voient
le changement à la seconde suivante. Un nouveau build iOS n'est nécessaire que
pour toucher au natif (permissions, plugins, icône, version minimale d'iOS).

**Pourquoi cette approche.** Le back-office est rendu côté serveur (middleware,
Server Actions, client Supabase serveur) : il ne peut pas être exporté en
fichiers statiques et embarqué dans le binaire. Une vraie app native (React
Native) aurait imposé de réécrire toute l'interface — 2 à 3 mois.

---

## 2. État d'avancement

### Fait

| Élément | Emplacement |
|---|---|
| Configuration de la coque | `capacitor.config.ts` |
| Projet Xcode | `ios/` |
| Écrans local (chargement, hors-ligne) | `mobile/www/` |
| Icône + écran de démarrage | `ios/App/App/Assets.xcassets/` |
| Permissions, mode arrière-plan push | `ios/App/App/Info.plist` |
| Entitlement APNs | `ios/App/App/App.entitlements` |
| Relais du jeton APNs | `ios/App/App/AppDelegate.swift` |
| Pont web ↔ natif | `src/components/mobile/PontNatif.tsx` |
| Détection du contexte natif | `src/lib/mobile/natif.ts`, `natif-serveur.ts` |
| Envoi APNs côté serveur | `src/lib/push/apns.ts` |
| Enregistrement des appareils | `src/app/pro/push/actions.ts` |
| Marges d'encoche | `globals.css` (`--pro-safe-*`), `SidebarPro`, `SidebarAdmin` |
| Compilation cloud | `codemagic.yaml` |

### À faire — côté Apple (vous)

1. **Compte Apple Developer** — 99 $/an, sur
   [developer.apple.com/programs](https://developer.apple.com/programs/).
   Comptez 24 à 48 h de validation, parfois davantage pour un compte
   d'entreprise (un numéro D-U-N-S est exigé). C'est le préalable à tout le
   reste.
2. **Identifiant d'app** — dans Certificates, Identifiers & Profiles, créer un
   App ID `ma.hoomy.pro` avec la capacité **Push Notifications** activée.
3. **Clé APNs** — Keys → « + » → cocher *Apple Push Notifications service*.
   Vous téléchargez un fichier `.p8` **une seule et unique fois** : conservez-le
   précieusement, Apple ne le redonne jamais. Notez le *Key ID* et votre
   *Team ID*.
4. **Fiche App Store Connect** — créer l'app, avec captures d'écran, description
   et politique de confidentialité (l'URL `https://hoomy.ma/confidentialite`
   existe déjà).
5. **Clé API App Store Connect** — Users and Access → Integrations, rôle
   *App Manager*. C'est ce que Codemagic utilise pour signer et publier.

### À faire — côté serveur (moi, quand vous aurez les clés)

Migration SQL à passer **avant** de déployer :

```bash
# Dans l'éditeur SQL de Supabase
push_appareils.sql
```

Variables d'environnement à ajouter sur Hostinger :

```bash
APNS_KEY_ID=XXXXXXXXXX          # Key ID de la clé .p8
APNS_TEAM_ID=XXXXXXXXXX         # Team ID Apple Developer
APNS_BUNDLE_ID=ma.hoomy.pro     # facultatif, c'est déjà la valeur par défaut
APNS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIG…\n-----END PRIVATE KEY-----"
```

> Le contenu du `.p8` tient sur une ligne, retours à la ligne échappés en `\n`.
> Tant que ces variables sont absentes, tout fonctionne normalement : le Web
> Push continue, seul le canal iOS reste muet.

---

## 3. Le risque à connaître : la règle 4.2 d'Apple

Apple **rejette les simples « sites web emballés »** au titre de la directive
*4.2 Minimum Functionality*. Le refus est fréquent et il vaut mieux le prévoir
que le découvrir.

Ce qui a été mis en place pour y répondre : notifications push natives, accès
appareil photo et photothèque, géolocalisation, partage système, retour
haptique, écran hors-ligne, réglage de la barre d'état, respect des zones
sûres. L'app fait donc des choses qu'un site dans Safari ne peut pas faire.

Deux précautions supplémentaires au moment de la soumission :

- **Renseigner un compte de démonstration** dans les notes de revue
  (identifiant + mot de passe d'un agent de test). Sans cela, le relecteur bute
  sur l'écran de connexion et rejette pour ce seul motif — c'est la première
  cause de refus.
- **Expliquer la nature de l'app** dans les notes : outil interne réservé aux
  agents immobiliers HOOMY, avec notifications temps réel sur les nouveaux
  prospects et prise de photos de biens sur le terrain.

Si le rejet tombe malgré tout, la parade classique consiste à déplacer une
fonction en natif — le plus souvent l'écran d'accueil ou la liste des biens.

---

## 4. Compiler et publier

Aucun Mac n'est nécessaire : **Codemagic** en loue à l'heure (500 min/mois
gratuites, un build en consomme ~10).

Mise en place, une fois :

1. Connecter le dépôt sur [codemagic.io](https://codemagic.io) — il détecte
   `codemagic.yaml` tout seul.
2. Teams → Integrations → **App Store Connect** : y déposer la clé API, en
   nommant l'intégration `hoomy_app_store` (le nom compte, il est référencé
   dans `codemagic.yaml`).
3. Créer un groupe de variables nommé `hoomy_ios` contenant `APP_STORE_APPLE_ID`
   (l'identifiant numérique de l'app, visible dans son URL App Store Connect).

Publier une version :

```bash
git tag ios-v1.0.0
git push origin ios-v1.0.0
```

Le tag déclenche le build ; l'IPA part sur TestFlight. La soumission à la revue
publique reste un geste manuel, depuis App Store Connect.

> Le déclencheur est restreint aux tags `ios-v*` : les commits ordinaires du
> site web ne consomment aucune minute Mac.

---

## 5. Travailler sur la partie native

```bash
npm run ios:sync      # recopie mobile/www + régénère la config native
npm run ios:ouvrir    # ouvre Xcode (macOS uniquement)
```

`npm run ios:sync` est à relancer après toute modification de
`capacitor.config.ts`, de `mobile/www/`, ou après l'ajout d'un plugin.

Pour tester la coque contre une préproduction plutôt que contre `pro.hoomy.ma` :

```bash
HOOMY_APP_URL=https://xxxx.trycloudflare.com npm run ios:sync
```

### Points de vigilance

- **`ios/App/App/capacitor.config.json` et `ios/App/App/public/` sont dérivés**
  et exclus du dépôt (`ios/.gitignore`). Ne pas les modifier à la main : ils
  sont régénérés à chaque `cap sync`.
- **La connexion se fait par email + mot de passe** (`FormulaireConnexionPro`),
  entièrement dans la WebView. Attention si un jour un lien magique ou un OAuth
  est ajouté au parcours pro : la session s'ouvrirait dans Safari, hors de
  l'app, et l'agent resterait déconnecté. Il faudrait alors mettre en place des
  liens universels.
- **APNs distingue deux serveurs** — `sandbox` pour les builds Xcode,
  `production` pour TestFlight et l'App Store. Les jetons ne sont pas
  interchangeables. `src/lib/push/apns.ts` bascule tout seul sur le bon serveur
  au premier échec et mémorise le résultat : rien à régler.
