-- ============================================================================
-- HOOMY.MA — Mesure d'audience interne SANS cookie (table mesure_audience)
-- À EXÉCUTER dans Supabase Dashboard → SQL Editor
--
-- POURQUOI : GA4 et le pixel Meta ne se chargent qu'après « Accepter » dans
-- le bandeau cookies. Constat du 13/10/2026 : Meta annonce 629 visites de la
-- fiche HM-95077, GA4 en compte 2. Le site était aveugle.
--
-- PRINCIPE (mesure d'audience exemptée de consentement) :
--   - aucun cookie, aucun stockage dans le navigateur (ni localStorage ni
--     sessionStorage) ;
--   - aucun identifiant de visiteur, de session ou de compte ;
--   - ni adresse IP, ni user-agent stockés (l'IP sert seulement à l'anti-abus,
--     en mémoire, et le user-agent à classer mobile / ordinateur) ;
--   - données uniquement agrégées, consultées en interne (/admin/audience).
--
-- Écriture : uniquement via la route /api/mesure (service_role).
-- Lecture : uniquement via la RPC stats_audience (service_role).
-- RLS activée SANS aucune policy → anon et authenticated n'ont aucun accès.
--
-- Ce script est IDEMPOTENT : il peut être rejoué sans risque.
-- ============================================================================


-- ── 1. Table ────────────────────────────────────────────────────────────────

create table if not exists public.mesure_audience (
  id              bigint generated always as identity primary key,
  cree_le         timestamptz not null default now(),
  chemin          text        not null,            -- ex. /acheter/villa-...-hm-95077 (sans query string)
  reference_bien  text,                            -- ex. HM-95077 si page de fiche
  source          text        not null default 'direct',
                  -- meta | google | whatsapp | moteur | ia | direct | autre
  entree          boolean     not null default false,
                  -- true = 1re page vue après un chargement complet = une arrivée sur le site
  appareil        text        not null default 'mobile'  -- mobile | ordinateur
);

alter table public.mesure_audience enable row level security;
-- (volontairement aucune policy)

create index if not exists idx_mesure_audience_cree_le
  on public.mesure_audience (cree_le desc);


-- ── 2. Statistiques agrégées pour l'admin ───────────────────────────────────
-- Tout est agrégé en SQL : évite la limite de 1 000 lignes de l'API Supabase.
-- Les jours sont calculés à l'heure du Maroc.

create or replace function public.stats_audience(p_depuis timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with m as (
    select * from public.mesure_audience where cree_le >= p_depuis
  )
  select jsonb_build_object(
    'visites', (select count(*) from m where entree),
    'pages',   (select count(*) from m),

    'par_jour', coalesce((
      select jsonb_agg(j order by j.jour)
      from (
        select (cree_le at time zone 'Africa/Casablanca')::date as jour,
               count(*) filter (where entree) as visites,
               count(*) as pages
        from m group by 1
      ) j
    ), '[]'::jsonb),

    'par_source', coalesce((
      select jsonb_agg(s order by s.visites desc)
      from (
        select source, count(*) as visites
        from m where entree group by source
      ) s
    ), '[]'::jsonb),

    'par_appareil', coalesce((
      select jsonb_agg(a order by a.visites desc)
      from (
        select appareil, count(*) as visites
        from m where entree group by appareil
      ) a
    ), '[]'::jsonb),

    'top_pages', coalesce((
      select jsonb_agg(p order by p.vues desc)
      from (
        select chemin, count(*) as vues
        from m group by chemin
        order by count(*) desc limit 15
      ) p
    ), '[]'::jsonb),

    'top_biens', coalesce((
      select jsonb_agg(b order by b.vues desc)
      from (
        select reference_bien,
               count(*) as vues,
               count(*) filter (where source = 'meta') as vues_meta
        from m where reference_bien is not null
        group by reference_bien
        order by count(*) desc limit 15
      ) b
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.stats_audience(timestamptz) from public, anon, authenticated;
grant execute on function public.stats_audience(timestamptz) to service_role;


-- ============================================================================
-- APRÈS EXÉCUTION — à vérifier
--   1. Ouvrir hoomy.ma (sur le téléphone, en navigation privée par exemple).
--   2. select * from mesure_audience order by cree_le desc limit 5;
--      → une ligne par page vue, entree = true pour la première.
--   3. Ouvrir /admin/audience : les chiffres doivent apparaître.
--
-- RÉTENTION (optionnel) : pour ne garder que 13 mois, à planifier plus tard :
--   delete from mesure_audience where cree_le < now() - interval '13 months';
-- ============================================================================
