-- ═══════════════════════════════════════════════════════════════════════════
-- HOOMY.MA — Table des estimations immobilières
-- À exécuter dans l'éditeur SQL Supabase (Project → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.estimations (
  id                  uuid              primary key default gen_random_uuid(),
  user_id             uuid              not null references auth.users(id) on delete cascade,

  ville               text              not null,
  quartier            text,
  latitude            double precision,
  longitude           double precision,

  type_bien           text              not null,
  transaction         text              not null,
  surface             numeric(10, 2)    not null,
  chambres            integer           not null default 0,
  salles_bain         integer           not null default 0,

  etat                text,
  etage               text,
  equipements         jsonb             not null default '[]'::jsonb,

  estimation_basse    numeric(14, 0)    not null,
  estimation_moyenne  numeric(14, 0)    not null,
  estimation_haute    numeric(14, 0)    not null,

  cree_le             timestamptz       not null default now()
);

create index if not exists idx_estimations_user_id on public.estimations(user_id);
create index if not exists idx_estimations_ville   on public.estimations(ville);
create index if not exists idx_estimations_cree_le on public.estimations(cree_le desc);

alter table public.estimations enable row level security;

-- Utilisateur voit ses propres estimations
create policy "utilisateur_voit_ses_estimations"
  on public.estimations for select
  using (auth.uid() = user_id);

-- Utilisateur peut créer ses estimations
create policy "utilisateur_insere_ses_estimations"
  on public.estimations for insert
  with check (auth.uid() = user_id);

-- Admin voit tout (rôle dans table profils)
create policy "admin_voit_toutes_estimations"
  on public.estimations for all
  using (
    exists (
      select 1 from public.profils
      where id = auth.uid() and role = 'admin'
    )
  );
