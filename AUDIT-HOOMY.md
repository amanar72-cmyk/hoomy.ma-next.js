# AUDIT HOOMY.MA — 2 juillet 2026

**Méthode** : lecture systématique du code (toutes les routes publiques, mon-compte, pro, admin), vérification TypeScript (`tsc --noEmit` : 0 erreur), build production (`npm run build` : 0 erreur, 0 warning), puis **tests HTTP réels** sur le serveur de production local (28 routes testées, fiches biens, route OG, payloads réseau inspectés). Aucune modification de code n'a été effectuée.

**Limites de l'audit** (environnement sans navigateur) : les erreurs console navigateur, le rendu responsive réel à 360 px et le score PageSpeed n'ont pas pu être mesurés ici — l'analyse statique n'a toutefois révélé aucune largeur fixe susceptible de casser à 360 px, et le score 94 actuel n'est menacé par aucun constat ci-dessous.

---

## 🔴 BLOQUANT

### 1. Coordonnées GPS exactes exposées au navigateur (confidentialité)
- **Pages** : `/acheter`, `/louer` (listes) et toutes les fiches biens
- **Preuve** : `latitude":30.3976005685652` visible dans le HTML brut de `/acheter` (testé en local). Le floutage existe mais est appliqué **côté client** ([MapboxLocalisation.tsx:31](src/components/detail/MapboxLocalisation.tsx#L31)) : n'importe qui peut lire la position exacte dans l'onglet Réseau.
- **Cause** : les listes font `select("*")` et passent l'objet `bien` complet (lat/lng inclus) au composant client `CarteAnnonce` ; la fiche passe les coordonnées exactes à `CarteLocalisation`.
- **Fichiers** : [src/app/acheter/page.tsx:46](src/app/acheter/page.tsx#L46), [src/app/louer/page.tsx](src/app/louer/page.tsx), [src/components/detail/MapboxLocalisation.tsx](src/components/detail/MapboxLocalisation.tsx), [src/components/detail/CarteLocalisation.tsx](src/components/detail/CarteLocalisation.tsx)
- **Correctif (1 ligne)** : déplacer `decalerPosition()` côté serveur et ne jamais sérialiser lat/lng exacts — c'est exactement le chantier prévu en Partie 2.

### 2. Partage cassé pour les biens sans slug (accès par UUID)
- **Pages** : fiches `/acheter/[slug]`, `/louer/[slug]`, bouton « Télécharger la carte de partage », aperçus réseaux sociaux
- **Preuve** : `/acheter/c7af7d64-…` (UUID) → la page s'affiche (200) mais `<title>Bien non trouvé | HOOMY.MA</title>` et `/api/og?slug=<uuid>` → **404**. Tout partage (Facebook, WhatsApp, carte OG) d'un bien sans slug est cassé : pas d'image, mauvais titre.
- **Cause** : `fetchBien()` a bien le fallback UUID, mais `generateMetadata()` et la route `/api/og` ne cherchent que par `slug`.
- **Fichiers** : [src/app/acheter/[slug]/page.tsx:34](src/app/acheter/[slug]/page.tsx#L34), [src/app/louer/[slug]/page.tsx:34](src/app/louer/[slug]/page.tsx#L34), [src/app/api/og/route.tsx:24](src/app/api/og/route.tsx#L24)
- **Correctif (1 ligne)** : réutiliser la même logique `fetchBien` (slug puis id) dans `generateMetadata` et `/api/og`.

### 3. Fiche accessible sous la mauvaise transaction (prix affiché en « DH/mois » pour une vente)
- **Pages** : `/louer/[slug]` et `/acheter/[slug]`
- **Preuve** : `/louer/terrain-agadir-hm-44342` (bien à **vendre**) → 200 avec `<title>… À louer à Agadir</title>` et description « Loyer : X DH/mois ». C'est une source du bug « prix mal formatés » : le même bien existe sous 2 URL avec 2 libellés de prix contradictoires (+ contenu dupliqué SEO).
- **Cause** : `fetchBien()` ne filtre pas `transaction`.
- **Fichiers** : [src/app/louer/[slug]/page.tsx:22](src/app/louer/[slug]/page.tsx#L22), [src/app/acheter/[slug]/page.tsx:22](src/app/acheter/[slug]/page.tsx#L22)
- **Correctif (1 ligne)** : filtrer `.eq("transaction", "location"/"vente")` et rediriger 301 vers la bonne URL si la transaction ne correspond pas.

### 4. Formulaire de publication : Chambres/Salles de bain proposés pour un Terrain
- **Page** : `/publier` (étape 4 + récapitulatif)
- **Preuve** : le terrain HM-44342 en base a `chambres = 1` (défaut du wizard) et sa carte publique affiche « 1 ch. ». Les compteurs démarrent à 1 et sont affichés quel que soit le type.
- **Fichiers** : [WizardPublication.tsx:742-743](src/components/publier/WizardPublication.tsx#L742-L743) (saisie), [WizardPublication.tsx:944-946](src/components/publier/WizardPublication.tsx#L944-L946) (récap), [src/app/publier/actions.ts:71-72](src/app/publier/actions.ts#L71-L72) (insert). Les formulaires admin ([FormulaireCreationBien.tsx:212](src/components/admin/FormulaireCreationBien.tsx#L212)) et agent ([FormulaireCreationBienAgent.tsx](src/components/pro/FormulaireCreationBienAgent.tsx)) affichent aussi ces champs pour un terrain (défaut 0, moins grave).
- **Correctif (1 ligne)** : masquer Chambres/Salles de bain (et forcer 0) quand `type === "Terrain"`, dans le wizard, le récap et les formulaires pro/admin.

---

## 🟠 IMPORTANT

### 5. Cartes d'annonce : « 0 ch. / 0 sdb » affichés pour les terrains et bureaux
- **Pages** : `/acheter`, `/louer`, accueil (biens en vedette)
- Les specs chambres/sdb sont affichées sans condition sur la carte publique.
- **Fichier** : [CarteAnnonce.tsx:292-299](src/components/annonces/CarteAnnonce.tsx#L292-L299)
- **Correctif** : masquer chambres/sdb si `type === "Terrain"` ou valeur ≤ 0 (la fiche détail le fait déjà correctement).

### 6. Route de diagnostic `/api/test-supabase` publique en production
- **Preuve** : 200 public, renvoie l'URL Supabase, le préfixe de la clé, le nombre de biens et l'état d'authentification du visiteur.
- **Fichier** : [src/app/api/test-supabase/route.ts](src/app/api/test-supabase/route.ts)
- **Correctif** : supprimer la route (ou la protéger par rôle admin).

### 7. Biens non vérifiés visibles publiquement dès leur soumission — **VÉRIFIÉ le 02/07/2026**
- **Pages** : `/acheter`, `/louer`
- **Constat vérifié** : les pages publiques utilisent bien la **clé anon** ([src/lib/supabase.ts](src/lib/supabase.ts)) — aucun bypass service_role. En revanche, test REST réel avec la clé anon : la RLS **ne restreint pas** la lecture — 2 biens `verifie: false` (statut `affecte`) sont retournés et donc listés publiquement avec le badge « Bientôt disponible ». Les statuts observés en base sont `finalise` et `affecte` (pas de statut « publié » distinct).
- **Décision produit à trancher** : si l'affichage « Bientôt disponible » des biens en attente est voulu, ce point est clos. Sinon, deux options :
  1. **RLS (recommandé, à exécuter dans Supabase)** :
     ```sql
     -- Ne laisser la lecture anonyme qu'aux biens vérifiés
     drop policy if exists "lecture publique biens" on public.biens;
     create policy "lecture publique biens" on public.biens
       for select to anon using (verifie = true);
     ```
     (adapter le nom de la policy existante ; garder une policy séparée pour `authenticated` afin que propriétaires/agents voient leurs biens non vérifiés)
  2. **Côté code** : ajouter `.eq("verifie", true)` dans les requêtes de `/acheter`, `/louer`, `BiensSimiliaires` et le sitemap.
- **Fichiers** : [src/app/acheter/page.tsx:46](src/app/acheter/page.tsx#L46), [src/app/louer/page.tsx](src/app/louer/page.tsx)

### 8. Pas de pagination sur `/acheter` et `/louer`
- Toute la table est chargée à chaque visite. OK avec 7 biens, dégradera PageSpeed et coûts avec des centaines (et la Partie 2 carte va s'appuyer sur ces listes).
- **Fichiers** : [src/app/acheter/page.tsx](src/app/acheter/page.tsx), [src/app/louer/page.tsx](src/app/louer/page.tsx)
- **Correctif** : `.range()` + pagination (le composant [Pagination.tsx](src/components/pro/Pagination.tsx) existe déjà côté pro).

### 9. SEO : titres dupliqués — 5 pages majeures sans metadata propre
- `/acheter`, `/louer`, `/publier`, `/connexion`, `/inscription` héritent du title racine « HOOMY.MA — L'immobilier premium au Maroc » (title dupliqué sur les 2 pages les plus importantes du site).
- **Fichiers** : [src/app/acheter/page.tsx](src/app/acheter/page.tsx), [src/app/louer/page.tsx](src/app/louer/page.tsx), [src/app/publier/page.tsx](src/app/publier/page.tsx), [src/app/connexion/page.tsx](src/app/connexion/page.tsx), [src/app/inscription/page.tsx](src/app/inscription/page.tsx)
- **Correctif** : ajouter `export const metadata` unique par page (title + description).

### 10. Sitemap incomplet et partiellement faux
- Aucune fiche bien dans le sitemap (les pages qui génèrent le trafic SEO) ; `/neuf` (page « en construction ») y figure ; `lastModified: new Date()` envoie une fausse date de mise à jour à chaque crawl. Manquent aussi `/simulateur-credit`, `/frais-acquisition`, `/carte`, `/comment-ca-marche`.
- **Fichier** : [src/app/sitemap.ts](src/app/sitemap.ts)
- **Correctif** : générer les URLs des biens depuis Supabase, retirer `/neuf`, utiliser `cree_le` comme lastModified.

### 11. Pas de pages 404 / erreur personnalisées
- **Preuve** : `/page-inexistante` → 404 Next.js par défaut (noir/blanc, anglais), hors identité HOOMY.
- **Fichiers** : `src/app/not-found.tsx` et `src/app/error.tsx` (absents)
- **Correctif** : créer les deux pages aux couleurs HOOMY avec liens de retour.

### 12. Calendrier admin : crash possible sur date malformée (même bug corrigé côté pro)
- **Page** : `/admin/calendrier`
- `formaterDateTuile()` appelle `toLocaleDateString` sans garde : une `date_souhaitee` non nulle mais malformée → `RangeError` (crash de page en Node 18+). Le garde `dateValide()` a été ajouté côté pro mais pas ici.
- **Fichier** : [src/app/admin/calendrier/page.tsx:49-56](src/app/admin/calendrier/page.tsx#L49-L56)
- **Correctif** : reprendre le garde `dateValide()` + tuile « — » du [pro/calendrier](src/app/pro/calendrier/page.tsx#L50-L63).

### 13. Formatage des prix : 16 fonctions dupliquées + causes probables du bug « prix collés »
- 16 copies locales de `formaterPrix` (admin, pro, compte…), locale `fr-FR` partout **sauf** `fr-MA` dans les emails. Deux causes probables des prix « collés » constatés : (a) `toLocaleString("fr-FR")` produit des espaces insécables étroites U+202F que la police de la **carte OG** (Satori, `/api/og`) peut ne pas rendre → « 1500000 DH » sur l'image de partage ; (b) l'accès mauvaise-transaction (point 3) affiche « DH/mois » sur une vente.
- **Fichiers** : [src/app/api/og/route.tsx:9-11](src/app/api/og/route.tsx#L9-L11), [src/lib/email/notifications.ts:3-6](src/lib/email/notifications.ts#L3-L6), + 14 autres copies
- **Correctif** : créer `src/lib/format.ts` (fonction unique, espaces ` ` explicites) et remplacer toutes les copies.

### 14. Favoris hors connexion : cœur cliquable mais rien n'est sauvegardé
- **Pages** : toutes les listes de biens
- Un visiteur non connecté peut « activer » le cœur (feedback visuel) mais rien n'est persisté et aucune invite de connexion n'apparaît — perte silencieuse.
- **Fichier** : [CarteAnnonce.tsx:362-389](src/components/annonces/CarteAnnonce.tsx#L362-L389)
- **Correctif** : si non connecté, rediriger vers `/connexion?redirect=…` (ou afficher un toast « Connectez-vous pour sauvegarder »).

### 15. Navigation vers des pages « en construction »
- `/neuf` est dans la **navbar principale** (+ sitemap) ; `/blog`, `/carrieres`, `/aide` dans le footer — toutes affichent `PageEnConstruction`.
- **Fichiers** : [Navbar.tsx:54](src/components/home/Navbar.tsx#L54), [Footer.tsx](src/components/home/Footer.tsx)
- **Correctif** : retirer ces liens ou ajouter un badge « Bientôt » (décision produit).

### 16. Espace pro : 8 pages alimentées par des données de démonstration
- `/pro/reseau`, `/pro/quartiers`, `/pro/partenariats`, `/pro/ressources`, `/pro/team`, `/pro/contacts`, `/pro/neuf`, `/pro/catalogue-neuf` utilisent `mockData.ts` — un vrai agent voit de faux prospects/quartiers sans avertissement.
- **Fichier** : [src/lib/pro/mockData.ts](src/lib/pro/mockData.ts)
- **Correctif** : afficher un bandeau « Données de démonstration » sur ces pages (ou les masquer).

---

## 🟢 COSMÉTIQUE

### 17. Deux formats d'affichage du téléphone
- `contact.ts` affiche « +212 708-789680 » (tiret) ; `formatPhoneMaroc()` produit « +212 XXX XX XX XX » (espaces). **Fichiers** : [src/lib/contact.ts:6](src/lib/contact.ts#L6), [src/lib/utils/telephone.ts](src/lib/utils/telephone.ts). **Correctif** : formater `telephoneAffichage` avec `formatPhoneMaroc`.

### 18. Labels de formulaires non associés aux champs (accessibilité)
- Les `<label>` n'ont pas de `htmlFor` (FiltresBar, wizards, calculateurs) : lecteurs d'écran et clic-sur-label inopérants. **Fichiers** : [FiltresBar.tsx:67-121](src/components/annonces/FiltresBar.tsx#L67-L121) et autres. **Correctif** : ajouter `htmlFor`/`id` (ou entourer le champ par le label).

### 19. Composant mort : `src/components/ListeBiens.tsx`
- Plus importé nulle part (contient en prime un bug d'affichage « , Ville » quand quartier est null). **Correctif** : supprimer le fichier.

### 20. Petits nettoyages de code
- Prop `chemin` jamais utilisée dans [CarteContact.tsx:14](src/components/detail/CarteContact.tsx#L14) ; `refDepuisSlug()` inutilisé dans [src/lib/url.ts](src/lib/url.ts). **Correctif** : supprimer.

### 21. Références générées sans contrôle d'unicité
- `HM-` + 5 chiffres aléatoires ([publier/actions.ts:18-21](src/app/publier/actions.ts#L18-L21)) : collision possible (2 biens même référence), et format à 5 chiffres ≠ format documenté HM-1001. **Correctif** : vérifier l'unicité en base avant insert (ou séquence SQL).

### 22. Messages de redirection jamais affichés
- Les gardes pro/admin redirigent vers `/?message=acces-reserve-pro` et `/?erreur=acces-refuse`, mais l'accueil n'affiche jamais ces paramètres. **Fichiers** : [pro/layout.tsx:37](src/app/pro/layout.tsx#L37), [admin/layout.tsx:36](src/app/admin/layout.tsx#L36), [src/app/page.tsx](src/app/page.tsx). **Correctif** : afficher un toast sur l'accueil (ou rediriger vers `/connexion`).

### 23. Titres de biens en minuscules affichés tels quels
- Preuve : `<title>terrain — À vendre à Agadir</title>`. **Correctif** : capitaliser la première lettre à l'affichage (title + H1) ou normaliser à la saisie.

### 24. Alt d'images génériques dans la galerie compte client
- [PhotoGalerie.tsx:25](src/components/ui/PhotoGalerie.tsx#L25) : `alt="Photo 1"` sans contexte (la galerie publique fait mieux : « {titre} — photo N »). **Correctif** : passer le titre du bien en prop.

### 25. Données structurées par bien absentes
- Le JSON-LD global (Organization/WebSite) est bien fait, mais les fiches n'émettent pas de `RealEstateListing`/`Offer` ni de `BreadcrumbList` — opportunité SEO. **Fichiers** : fiches `[slug]`. **Correctif** : ajouter un script JSON-LD par fiche.

---

## Vérifications passées avec succès ✅

- **Build** : 0 erreur, 0 warning TypeScript (`tsc --noEmit` + `npm run build`).
- **28 routes testées en HTTP réel** : toutes répondent 200 (ou 404 attendu).
- **Sécurité** : aucune clé en dur dans le code ; `service_role` uniquement dans des Server Actions/pages serveur ; SMTP en variables d'env ; gardes d'authentification pro (`agent`/`agence`/`admin`) et admin (`admin`) corrects ; callback auth gère bien les deux flux (PKCE + OTP).
- **États vides** : présents et soignés sur les listes publiques, mon-compte, pro et admin ; aucun « NaN »/« undefined »/« Invalid Date » détecté dans les rendus testés (les gardes récents sur le calendrier pro fonctionnent).
- **Chantiers récents intacts** : module affectations, carte conseiller client, bouton calendrier .ics — rien à signaler, non touchés.
- **Responsive (analyse statique)** : pas de largeur fixe problématique détectée pour 360 px.
