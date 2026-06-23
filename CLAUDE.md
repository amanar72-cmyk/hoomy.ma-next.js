@AGENTS.md

# HOOMY.MA — Guide du projet pour Claude Code

## Commandes

```bash
npm run dev      # Serveur de développement (localhost:3000)
npm run build    # Build production (vérifier 0 erreur avant tout commit)
npm run lint     # ESLint
```

Il n'y a pas de tests automatisés dans ce projet.

## Stack technique
- **Frontend** : Next.js 16 (App Router), TypeScript, React 19
- **Styling** : Tailwind CSS v4 (pas de shadcn/ui — les composants UI sont écrits manuellement)
- **Backend** : Supabase (PostgreSQL + Storage + Auth)
- **Hébergement** : Vercel
- **Cartographie** : Mapbox GL via react-map-gl

## Identité visuelle
- **Vert Royal** : #0F4C3A (couleur principale)
- **Émeraude** : #146C43
- **Gold** : #D4AF37 (accents, boutons CTA)
- **Font titres** : Marcellus (Google Fonts)
- **Font corps** : Outfit (Google Fonts)
- **Langue** : Tout en français
- **Style** : Premium, épuré, inspiré de yakeey.com et agenz.ma

## Structure du projet
- `src/app/` → Pages (App Router)
- `src/app/acheter/[slug]/` → Page détail achat
- `src/app/louer/[slug]/` → Page détail location
- `src/components/` → Composants réutilisables
- `src/components/home/` → Composants page d'accueil
- `src/lib/` → Supabase client et utilitaires

## Base de données Supabase — Table "biens"
| Colonne | Type | Description |
|---|---|---|
| identifiant | uuid | Clé primaire |
| référence | texte | Ex: HM-1001 |
| limace | texte | Slug URL |
| titre | texte | Titre de l'annonce |
| description | texte | Description complète |
| taper | texte | Appartement / Villa / Riad / Bureau / Terrain |
| transaction | texte | "vente" ou "location" |
| prix | numérique | En dirhams (DH) |
| ville | texte | Casablanca / Marrakech / Rabat / Tanger / Agadir / Fès |
| chambres | entier | Nombre de chambres |
| salles_bain | entier | Nombre de salles de bain |
| surface | numérique | En m² |
| latitude | double | Coordonnée GPS |
| longitude | double | Coordonnée GPS |
| équipements | jsonb | Tableau d'équipements |
| photos | jsonb | Tableau d'URLs (Supabase Storage) |
| vérifier | booléen | true = bien vérifié par HOOMY |
| cree_le | horodatage | Date de création |

## Conventions de code
- Composants en TypeScript avec types stricts
- Server Components pour les fetches Supabase
- Client Components uniquement si interaction utilisateur nécessaire
- Tailwind CSS uniquement (pas de CSS externe)
- Commentaires en français
- Prix formatés : "1 500 000 DH" (vente) ou "5 000 DH/mois" (location)

## Clients Supabase — trois contextes distincts

| Import | Usage |
|---|---|
| `@/lib/supabase` | Client public (anon key) — Server Components publics |
| `@/lib/supabase/server` | Client SSR avec cookies — Server Components authentifiés, Server Actions |
| `@/lib/supabase/admin` | Client service_role — Server Actions admin uniquement, jamais côté client |

## Architecture composants

**Server Components par défaut.** Client Components (`"use client"`) uniquement si l'interactivité l'exige (useState, événements, hooks).

Un Server Component peut toujours _rendre_ un Client Component — c'est le pattern utilisé partout (ex. : `BiensSimiliaires` Server → `CarteAnnonce` Client).

**Composants clés :**
- `CarteAnnonce` — carte bien publique avec favoris, comparateur, tracking clics
- `ComparateurProvider` — contexte en root layout, disponible partout dans l'arbre
- Design tokens CSS dans `globals.css` (`:root` + `[data-theme="dark"]`) — toujours utiliser `var(--...)` plutôt que des valeurs hardcodées

**Zones protégées :**
- `/pro/*` → espace agent (auth Supabase)
- `/admin/*` → espace administrateur (rôle admin)
- Auth via Supabase Auth (magic link + OTP téléphone)

## Pages existantes
- `/` → Page d'accueil
- `/acheter` → Liste des biens à vendre
- `/louer` → Liste des biens à louer
- `/acheter/[slug]` → Détail bien vente
- `/louer/[slug]` → Détail bien location
- `/estimer` → Wizard d'estimation
- `/comparer` → Comparateur de biens
- `/carte` → Carte interactive Mapbox
- `/pro/*` → Dashboard agent
- `/admin/*` → Back-office administrateur