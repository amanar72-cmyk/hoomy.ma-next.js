-- ============================================================================
-- HOOMY.MA — Mémoire de conversation de l'agent commercial IA
-- À EXÉCUTER dans Supabase Dashboard → SQL Editor
--
-- Donne un ÉTAT à l'agent (src/lib/agent/cerveau.ts), aujourd'hui sans mémoire :
-- chaque message était traité isolément, d'où les re-salutations et les
-- questions déjà posées.
--
-- Deux tables :
--   conversations_agent : un fil par numéro (fenêtre de 24 h), + la mémoire
--                         des critères accumulés (jsonb).
--   messages_agent      : l'historique message par message.
--
-- SÉCURITÉ — ces tables contiennent des conversations de clients réels :
--   - AUCUNE policy pour anon/authenticated → strictement illisibles côté
--     public, y compris pour un utilisateur connecté.
--   - Lecture admin via is_admin() (défini dans admin_policies.sql).
--   - Écriture : service_role UNIQUEMENT (webhook WhatsApp + simulateur), qui
--     contourne la RLS par conception et n'a donc besoin d'aucune policy.
--   Même principe que tentatives_connexion.sql.
--
-- Ce script est IDEMPOTENT : il peut être rejoué sans risque.
-- ============================================================================


-- ── 1. Table des conversations ──────────────────────────────────────────────

create table if not exists public.conversations_agent (
  id         uuid primary key default gen_random_uuid(),
  -- Numéro WhatsApp normalisé E.164 (+212...), SANS le préfixe "whatsapp:"
  -- que Twilio ajoute — la normalisation est faite côté code.
  telephone  text not null,
  canal      text not null default 'whatsapp',
  statut     text not null default 'auto'
             check (statut in ('auto', 'transfere_humain', 'close')),
  -- Critères accumulés : ville, transaction, type, budget_max, chambres,
  -- quartier, prenom. Schéma volontairement souple (l'agent évolue vite).
  memoire    jsonb not null default '{}'::jsonb,
  cree_le    timestamptz not null default now(),
  maj_le     timestamptz not null default now()
);

-- Recherche de la conversation ouverte d'un numéro : filtre sur telephone +
-- statut, tri par récence. Index composite plutôt que sur telephone seul.
create index if not exists idx_conversations_agent_telephone
  on public.conversations_agent (telephone, statut, maj_le desc);


-- ── 2. Table des messages ───────────────────────────────────────────────────

create table if not exists public.messages_agent (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
                  references public.conversations_agent (id) on delete cascade,
  role            text not null check (role in ('client', 'agent')),
  contenu         text not null,
  cree_le         timestamptz not null default now()
);

-- Chargement des N derniers messages d'une conversation (ordre chronologique).
create index if not exists idx_messages_agent_conversation
  on public.messages_agent (conversation_id, cree_le);


-- ── 3. Fraîcheur de la conversation (règle des 24 h) ────────────────────────
-- maj_le doit refléter le DERNIER message, sinon la fenêtre de 24 h se
-- calculerait sur la date de création du fil et un fil actif serait rouvert
-- au bout de 24 h. Le trigger garantit l'invariant même si un autre chemin
-- d'écriture apparaît plus tard.

create or replace function public.touch_conversation_agent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations_agent
     set maj_le = now()
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_touch_conversation_agent on public.messages_agent;

create trigger trg_touch_conversation_agent
  after insert on public.messages_agent
  for each row execute function public.touch_conversation_agent();


-- ── 4. RLS ──────────────────────────────────────────────────────────────────
-- Activée SANS policy pour anon/authenticated → aucune lecture publique.
-- Seules les policies admin ci-dessous ouvrent la lecture.

alter table public.conversations_agent enable row level security;
alter table public.messages_agent      enable row level security;

drop policy if exists "Admin lit les conversations" on public.conversations_agent;
drop policy if exists "Admin lit les messages"      on public.messages_agent;

-- Lecture SEULE, et réservée à l'admin (futur back-office de supervision).
-- Pas de policy insert/update/delete : l'écriture passe par service_role.
create policy "Admin lit les conversations"
  on public.conversations_agent for select
  to authenticated
  using (is_admin());

create policy "Admin lit les messages"
  on public.messages_agent for select
  to authenticated
  using (is_admin());


-- ============================================================================
-- APRÈS EXÉCUTION — vérifications
--
-- 1. Depuis /admin/agent-simulateur, envoyer 2 messages qui se suivent
--    (ex. « bonjour je cherche un appart » puis « à Agadir »), puis :
--      select telephone, statut, memoire, maj_le from conversations_agent
--       where telephone = '+212000000000';
--      -- memoire doit contenir {"type":"Appartement","ville":"Agadir",...}
--      select role, contenu, cree_le from messages_agent order by cree_le;
--      -- 4 lignes : client, agent, client, agent
--
-- 2. Le numéro +212000000000 est celui du simulateur admin (fictif, réservé).
--    Pour repartir d'une conversation vierge :
--      delete from conversations_agent where telephone = '+212000000000';
--      -- les messages suivent par ON DELETE CASCADE
--
-- 3. Vérifier l'étanchéité (doit renvoyer 0 ligne, jamais une erreur) :
--      -- en anon, depuis le navigateur : select * from conversations_agent;
-- ============================================================================
