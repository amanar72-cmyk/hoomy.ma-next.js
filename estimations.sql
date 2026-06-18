-- Table des estimations immobilières générées par le wizard /estimer
-- À exécuter dans l'éditeur SQL de Supabase

create table if not exists estimations (
  id                 uuid        primary key default gen_random_uuid(),
  user_id            uuid        references auth.users(id) on delete cascade,
  ville              text        not null,
  quartier           text,
  type_bien          text        not null,
  transaction        text        not null,   -- "vente" ou "location"
  surface            numeric     not null,
  chambres           integer,
  salles_bain        integer,
  etat               text,                   -- "neuf", "bon_etat", "a_renover"
  etage              text,                   -- "rdc", "intermediaire", "dernier"
  equipements        jsonb       not null default '[]'::jsonb,
  estimation_basse   numeric,
  estimation_moyenne numeric,
  estimation_haute   numeric,
  cree_le            timestamptz not null default now()
);

alter table estimations enable row level security;

-- L'utilisateur voit ses propres estimations
create policy "Utilisateur voit ses estimations"
  on estimations for select
  using (user_id = auth.uid());

-- L'utilisateur crée ses estimations
create policy "Utilisateur crée ses estimations"
  on estimations for insert
  with check (user_id = auth.uid());

-- L'admin voit toutes les estimations
create policy "Admin voit toutes les estimations"
  on estimations for select
  using (is_admin());
