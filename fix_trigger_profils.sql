-- ============================================================
-- HOOMY.MA — Correction du trigger on_auth_user_created
-- EXÉCUTER dans Supabase Dashboard → SQL Editor
-- ============================================================
-- Ce trigger est la CAUSE RACINE : il crashait à chaque signUp
-- et bloquait la création de compte avec erreur 500.
-- ============================================================

-- 1. Supprimer l'ancien trigger s'il existe (même cassé)
drop trigger if exists on_auth_user_created on auth.users;

-- 2. Supprimer l'ancienne fonction s'il existe
drop function if exists public.handle_new_user();

-- 3. Créer la fonction trigger propre
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profils (id, nom_complet, telephone, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'nom_complet',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'telephone',
    'acheteur'
  )
  on conflict (id) do nothing;   -- idempotent : ne plante pas si le profil existe déjà
  return new;
end;
$$;

-- 4. Créer le trigger sur auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

-- 5. Vérification — doit retourner la ligne du trigger créé
select tgname, tgenabled
from pg_trigger
where tgname = 'on_auth_user_created';
