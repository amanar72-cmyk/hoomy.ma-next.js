-- ═══════════════════════════════════════════════════════════════════════════
-- Appareils iOS enregistrés pour les notifications push (APNs)
-- ═══════════════════════════════════════════════════════════════════════════
-- La table push_subscriptions existante stocke des abonnements Web Push
-- (endpoint + clés VAPID p256dh/auth). L'application iOS native ne fonctionne
-- pas ainsi : Apple délivre un simple « device token » hexadécimal, poussé vers
-- ses propres serveurs. Les deux mécanismes n'ont ni le même format ni le même
-- transport, d'où une table distincte plutôt qu'un détournement de l'ancienne.
--
-- Un même agent peut porter plusieurs appareils (iPhone + iPad) : la clé
-- d'unicité porte sur le couple (user_id, jeton), jamais sur user_id seul.
--
-- ⚠ À PASSER AVANT de déployer le code qui lit cette table. src/lib/push/apns.ts
--   tolère son absence (codes 42P01 / PGRST205) et se contente alors du Web
--   Push, mais aucune notification n'atteindra les iPhones tant qu'elle manque.
--
-- Script idempotent : réexécutable sans effet de bord.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.push_appareils (
  id            uuid primary key default gen_random_uuid(),

  -- Propriétaire de l'appareil. La suppression du compte purge ses jetons.
  user_id       uuid not null references auth.users (id) on delete cascade,

  -- Jeton de l'appareil. Deux formats bien distincts selon la plateforme :
  -- APNs renvoie 64 caractères hexadécimaux, FCM une longue chaîne opaque.
  jeton         text not null,

  -- Aiguille l'envoi vers le bon service : Apple (APNs) ou Google (FCM).
  -- Les deux ne partagent ni protocole, ni format de jeton, ni authentification.
  plateforme    text not null default 'ios'
                check (plateforme in ('ios', 'android')),

  -- iOS UNIQUEMENT — sans objet pour Android, que FCM sert d'une seule adresse.
  -- APNs expose DEUX serveurs aux jetons NON interchangeables : « sandbox »
  -- pour les builds lancés depuis Xcode, « production » pour TestFlight et
  -- l'App Store. S'adresser au mauvais renvoie BadDeviceToken. La valeur est
  -- corrigée toute seule au premier échec (voir src/lib/push/apns.ts), d'où ce
  -- défaut optimiste : la très grande majorité des appareils sera en production.
  environnement text not null default 'production'
                check (environnement in ('production', 'sandbox')),

  -- Contexte de diagnostic : « iPhone 15 Pro », « 1.0.3 »…
  modele        text,
  version_app   text,

  cree_le       timestamptz not null default now(),
  -- Rafraîchi à chaque ouverture de l'app : permet de purger les appareils
  -- muets depuis des mois sans attendre un rejet d'Apple.
  vu_le         timestamptz not null default now(),

  constraint push_appareils_user_jeton_unique unique (user_id, jeton)
);

-- Rattrapage : sur une base où la table avait déjà été créée sans cette
-- colonne, « create table if not exists » ci-dessus n'aurait rien fait.
alter table public.push_appareils
  add column if not exists plateforme text not null default 'ios';

-- Lecture systématique par (utilisateur, plateforme) au moment de l'envoi :
-- apns.ts ne veut que les iPhones, fcm.ts que les appareils Android.
create index if not exists idx_push_appareils_user_plateforme
  on public.push_appareils (user_id, plateforme);

-- Seul accès de lecture au moment de l'envoi : tous les appareils d'un agent.
create index if not exists idx_push_appareils_user
  on public.push_appareils (user_id);

-- ─── RLS ───────────────────────────────────────────────────────────────────
-- Un jeton APNs est une donnée personnelle : un agent ne doit jamais voir ceux
-- des autres. L'envoi côté serveur passe par le client service_role, qui
-- contourne RLS — ces policies ne couvrent donc que l'enregistrement et la
-- suppression déclenchés depuis l'app elle-même.
alter table public.push_appareils enable row level security;

drop policy if exists "appareils ios lisibles par leur proprietaire" on public.push_appareils;
create policy "appareils ios lisibles par leur proprietaire"
  on public.push_appareils for select
  using (auth.uid() = user_id);

drop policy if exists "appareils ios inserables par leur proprietaire" on public.push_appareils;
create policy "appareils ios inserables par leur proprietaire"
  on public.push_appareils for insert
  with check (auth.uid() = user_id);

drop policy if exists "appareils ios modifiables par leur proprietaire" on public.push_appareils;
create policy "appareils ios modifiables par leur proprietaire"
  on public.push_appareils for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "appareils ios supprimables par leur proprietaire" on public.push_appareils;
create policy "appareils ios supprimables par leur proprietaire"
  on public.push_appareils for delete
  using (auth.uid() = user_id);
