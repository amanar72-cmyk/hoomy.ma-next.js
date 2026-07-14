-- Date de publication d'un bien — à exécuter dans l'éditeur SQL Supabase.
--
-- Il n'existait aucune trace de la date de mise en ligne : le statut passe à
-- « finalise » via le formulaire admin ou des RPC, sans horodatage dédié.
-- Un trigger BEFORE capte TOUS les chemins d'écriture (formulaire, RPC, API)
-- sans modifier le code applicatif.

-- 1) Colonne
alter table public.biens
  add column if not exists date_publication timestamptz;

-- 2) Rétro-remplissage des biens déjà publiés : meilleure approximation
--    disponible = date d'affectation, sinon date de création.
update public.biens
set date_publication = coalesce(date_affectation, cree_le)
where statut in ('finalise', 'transacte')
  and date_publication is null;

-- 3) Trigger : première transition vers « finalise » → horodatage.
--    On ne réécrit jamais une date déjà posée (re-publication après suspension).
create or replace function public.definir_date_publication()
returns trigger
language plpgsql
as $$
begin
  if new.statut = 'finalise'
     and new.date_publication is null
     and (tg_op = 'INSERT' or old.statut is distinct from 'finalise') then
    new.date_publication := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_biens_date_publication on public.biens;
create trigger trg_biens_date_publication
before insert or update of statut on public.biens
for each row
execute function public.definir_date_publication();
