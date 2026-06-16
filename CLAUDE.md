@AGENTS.md

# HOOMY.MA — Guide du projet pour Claude Code

## Stack technique
- **Frontend** : Next.js 14+ (App Router), TypeScript
- **Styling** : Tailwind CSS, shadcn/ui
- **Backend** : Supabase (PostgreSQL)
- **Hébergement** : Vercel

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

## Client Supabase
Toujours importer depuis `@/lib/supabase`

## Pages existantes
- `/` → Page d'accueil (à construire)
- `/acheter` → Liste des biens à vendre (à construire)
- `/louer` → Liste des biens à louer (à construire)
- `/acheter/[slug]` → Détail bien vente (à construire)
- `/louer/[slug]` → Détail bien location (à construire)