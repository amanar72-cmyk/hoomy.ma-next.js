-- ============================================================================
-- Table des tentatives de connexion (logs & sécurité admin)
-- À exécuter dans l'éditeur SQL Supabase.
--
-- Sécurité : RLS ACTIVÉE sans aucune policy → ni anon ni authenticated ne
-- peuvent lire/écrire. Seul le client service_role y accède :
--   - écriture : route /api/connexion-log
--   - lecture  : page /admin/logs (Server Component, derrière la garde admin)
-- ============================================================================

create table if not exists public.tentatives_connexion (
  id          uuid primary key default gen_random_uuid(),
  cree_le     timestamptz not null default now(),
  email       text,
  methode     text not null default 'mot_de_passe',   -- mot_de_passe | google | pro
  resultat    text not null default 'echec',           -- succes | echec
  motif       text,                                     -- raison de l'échec, le cas échéant
  adresse_ip  text,
  user_agent  text
);

-- Index pour le tri chronologique et les filtres/recherches de la page admin
create index if not exists idx_tentatives_connexion_cree_le
  on public.tentatives_connexion (cree_le desc);
create index if not exists idx_tentatives_connexion_resultat
  on public.tentatives_connexion (resultat);
create index if not exists idx_tentatives_connexion_email
  on public.tentatives_connexion (email);

-- RLS activée, AUCUNE policy : accès réservé au service_role (qui contourne la RLS)
alter table public.tentatives_connexion enable row level security;

-- Optionnel : purge automatique des logs de plus de 180 jours.
-- À déclencher via un cron Supabase (pg_cron) si souhaité :
--   select cron.schedule(
--     'purge-tentatives-connexion', '0 3 * * *',
--     $$ delete from public.tentatives_connexion where cree_le < now() - interval '180 days' $$
--   );
