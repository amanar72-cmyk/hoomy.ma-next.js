-- ============================================================================
-- HOOMY.MA — Réparation du tracking des biens (vues / clics / contacts)
-- À EXÉCUTER dans Supabase Dashboard → SQL Editor
--
-- CONSTAT (audit du 15/07/2026) :
--   - La table evenements_bien contient 1 seule ligne, de session_id
--     "test-claude-audit". Zéro événement réel, alors que la base contient
--     par ailleurs 6 biens, 3 leads, 5 demandes de visite, 4 favoris et
--     17 tentatives de connexion : le site a donc bien du trafic réel.
--     → les insertions du tracking échouent en silence.
--   - La colonne biens.vues N'EXISTE PAS, alors que src/lib/tracking/track.ts
--     appelle rpc("incrementer_vue") à chaque vue. Cet appel échoue à chaque
--     fois, sans bruit (le code enveloppe tout dans void + try/catch vide).
--
-- Ce script est IDEMPOTENT : il peut être rejoué sans risque.
-- ============================================================================


-- ── 1. Compteur rapide de vues sur les biens ────────────────────────────────
-- Utilisé pour l'affichage "N vues" sans agréger evenements_bien à chaque fois.

alter table public.biens
  add column if not exists vues integer not null default 0;


-- ── 2. RPC d'incrémentation ─────────────────────────────────────────────────
-- SECURITY DEFINER : la fonction s'exécute avec les droits de son
-- propriétaire, donc elle contourne la RLS de "biens" (qui interdit à juste
-- titre l'UPDATE au public). C'est le SEUL chemin par lequel un visiteur
-- anonyme peut toucher la table biens, et il est limité à +1 sur une colonne.
-- set search_path : empêche le détournement de la fonction via un schéma
-- malveillant placé en tête de search_path.

create or replace function public.incrementer_vue(p_bien_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.biens
     set vues = coalesce(vues, 0) + 1
   where id = p_bien_id;
$$;

revoke all on function public.incrementer_vue(uuid) from public;
grant execute on function public.incrementer_vue(uuid) to anon, authenticated;


-- ── 3. RLS sur evenements_bien ──────────────────────────────────────────────
-- Écriture : ouverte au public, car le tracking part du navigateur avec la clé
-- anon (src/lib/tracking/track.ts). C'est un écart assumé au pattern de
-- rls_demandes_visite.sql, où l'insertion publique passe par service_role.
-- Il est encadré par le with check ci-dessous.
-- Lecture : AUCUNE policy → ni anon ni authenticated ne peuvent lire. Seul
-- service_role y accède (futures stats admin, Server Component derrière la
-- garde admin). Même principe que tentatives_connexion.

alter table public.evenements_bien enable row level security;

drop policy if exists "Tracking public en insertion" on public.evenements_bien;

create policy "Tracking public en insertion"
  on public.evenements_bien for insert
  to anon, authenticated
  with check (
    -- Seuls les trois types connus du code (TypeEvenement)
    type_evenement in ('vue', 'clic', 'contact')
    -- Interdit d'attribuer un événement à quelqu'un d'autre : soit anonyme,
    -- soit son propre compte. Sans ça, n'importe qui pourrait forger l'activité
    -- d'un utilisateur connecté.
    and (visiteur_id is null or visiteur_id = auth.uid())
  );


-- ── 4. Index pour les futures statistiques ──────────────────────────────────
-- "vues d'un bien sur 30 jours" et "total par type sur une période".

create index if not exists idx_evenements_bien_bien_cree_le
  on public.evenements_bien (bien_id, cree_le desc);

create index if not exists idx_evenements_bien_type_cree_le
  on public.evenements_bien (type_evenement, cree_le desc);


-- ── 5. Nettoyage de la ligne de test ────────────────────────────────────────

delete from public.evenements_bien where session_id = 'test-claude-audit';


-- ============================================================================
-- APRÈS EXÉCUTION — à vérifier
--
-- 1. Ouvrir une fiche bien sur le site public, puis :
--      select count(*) from evenements_bien;   -- doit passer à 1+
--      select id, titre, vues from biens order by vues desc limit 5;
--    Si le compte reste à 0, l'insertion est bloquée ailleurs (vérifier la
--    console du navigateur : une erreur PostgREST 401/403 y apparaîtra).
--
-- 2. RGPD — POINT OUVERT, à trancher avant de laisser tourner :
--    Ce tracking dépose un cookie "hoomy_sid" (24 h) et enregistre le
--    visiteur_id des utilisateurs connectés, SANS passer par le bandeau de
--    consentement posé dans src/components/analytique/. La CNIL exempte la
--    mesure d'audience strictement interne, mais l'exemption suppose des
--    données non recoupées avec un compte utilisateur — or visiteur_id est
--    exactement ce recoupement. Deux options :
--      a) retirer visiteur_id et ne garder que session_id (→ exemption OK) ;
--      b) conditionner le tracking au consentement, comme GA4 et le Pixel.
-- ============================================================================
