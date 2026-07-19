-- ============================================================
-- HOOMY.MA — Répertoire PROPRIÉTAIRES (vendeurs) — incrément A
-- ============================================================
-- Table séparée des `contacts` (acheteurs) : répertoire géré à la
-- main par les agents, auquel on rattache les biens commercialisés.
-- Rejouable sans risque (if not exists / drop policy if exists).
--
-- IMPORTANT : la colonne ajoutée sur `biens` s'appelle `vendeur_id`
-- (PAS proprietaire_id, déjà pris = compte utilisateur du site).
-- Elle est NULLABLE : les biens existants ne bougent pas.

-- ============================================================
-- 1. Table proprietaires
-- ============================================================
create table if not exists public.proprietaires (
  id        uuid primary key default gen_random_uuid(),
  nom       text not null,
  prenom    text,
  telephone text not null,
  email     text,
  notes     text,
  cree_le   timestamptz not null default now(),
  maj_le    timestamptz not null default now()
);

-- Téléphone unique (normalisé +212 côté application, comme les contacts)
-- → empêche de créer deux fois le même propriétaire.
create unique index if not exists proprietaires_telephone_unique
  on public.proprietaires (telephone);

-- maj_le tenu à jour automatiquement à chaque modification
create or replace function public.proprietaires_maj_le()
returns trigger
language plpgsql
as $$
begin
  new.maj_le = now();
  return new;
end;
$$;

drop trigger if exists trg_proprietaires_maj_le on public.proprietaires;
create trigger trg_proprietaires_maj_le
  before update on public.proprietaires
  for each row execute function public.proprietaires_maj_le();

-- ============================================================
-- 2. Colonne vendeur_id sur biens (NULLABLE — anciens biens intacts)
-- ============================================================
-- on delete set null : supprimer une fiche propriétaire ne casse
-- jamais un bien — il redevient simplement « sans vendeur ».
alter table public.biens
  add column if not exists vendeur_id uuid
  references public.proprietaires (id) on delete set null;

create index if not exists biens_vendeur_id_idx
  on public.biens (vendeur_id);

-- ============================================================
-- 3. Helper de rôle est_pro() — même modèle que is_admin()
-- (SECURITY DEFINER + search_path fixé : pas de récursion sur profils)
-- ============================================================
create or replace function public.est_pro()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profils
    where id = auth.uid() and role in ('agent', 'agence')
  );
$$;

-- ============================================================
-- 4. RLS — répertoire PARTAGÉ entre tous les agents
--    admin : tout ; agent/agence : lire, créer, modifier ;
--    suppression : admin uniquement ; public/anon : rien.
-- ============================================================
alter table public.proprietaires enable row level security;

drop policy if exists "Pros et admin lisent les proprietaires"    on public.proprietaires;
drop policy if exists "Pros et admin creent les proprietaires"    on public.proprietaires;
drop policy if exists "Pros et admin modifient les proprietaires" on public.proprietaires;
drop policy if exists "Admin supprime les proprietaires"          on public.proprietaires;

create policy "Pros et admin lisent les proprietaires"
  on public.proprietaires for select
  using (is_admin() or est_pro());

create policy "Pros et admin creent les proprietaires"
  on public.proprietaires for insert
  with check (is_admin() or est_pro());

create policy "Pros et admin modifient les proprietaires"
  on public.proprietaires for update
  using (is_admin() or est_pro());

create policy "Admin supprime les proprietaires"
  on public.proprietaires for delete
  using (is_admin());
