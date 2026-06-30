import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import type { Metadata } from "next";
import ModalZonesAgent from "@/components/admin/ModalZonesAgent";
import SelectRole from "@/components/admin/SelectRole";
import SelecteurConseillerAdmin from "@/components/admin/SelecteurConseillerAdmin";

export const metadata: Metadata = {
  title: "Agents — Administration HOOMY.MA",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type Agent = {
  id: string;
  nom_complet: string | null;
  telephone: string | null;
  role: string;
  zones: string[] | null;
  avatar_url: string | null;
  cree_le: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  agent:  "Agent",
  agence: "Agence",
};

function formaterDate(d: string) {
  return new Date(d).toLocaleDateString("fr-MA", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ── searchParams ──────────────────────────────────────────────────────────────

type SearchParams = Promise<{ q?: string }>;

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PageAdminAgents({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";

  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Agents + agences
  let query = supabase
    .from("profils")
    .select("id, nom_complet, telephone, role, zones, avatar_url, cree_le")
    .in("role", ["agent", "agence"])
    .order("nom_complet", { ascending: true });

  if (q) query = query.ilike("nom_complet", `%${q}%`);

  const { data: agentsRaw } = await query.limit(200);
  const agents = (agentsRaw ?? []) as unknown as Agent[];
  const agentIds = agents.map((a) => a.id);

  // Emails depuis auth.users (adminClient)
  let emailMap: Record<string, string> = {};
  try {
    const { data: { users } } = await adminClient.auth.admin.listUsers({ perPage: 500 });
    emailMap = Object.fromEntries(users.map((u) => [u.id, u.email ?? ""]));
  } catch { /* email non critique */ }

  // Compteurs biens (tous statuts)
  let biensParAgent: Record<string, number> = {};
  if (agentIds.length > 0) {
    const { data: biensData } = await supabase
      .from("biens")
      .select("agent_id")
      .in("agent_id", agentIds);
    for (const b of biensData ?? []) {
      const id = b.agent_id as string;
      biensParAgent[id] = (biensParAgent[id] ?? 0) + 1;
    }
  }

  // Compteurs leads
  let leadsParAgent: Record<string, number> = {};
  if (agentIds.length > 0) {
    const { data: leadsData } = await supabase
      .from("demandes_visite")
      .select("agent_id")
      .in("agent_id", agentIds);
    for (const l of leadsData ?? []) {
      const id = l.agent_id as string | null;
      if (id) leadsParAgent[id] = (leadsParAgent[id] ?? 0) + 1;
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">

      {/* En-tête */}
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold mb-0.5" style={{ color: "#111" }}>
            Agents & Agences
          </h1>
          <p className="text-sm" style={{ color: "#999" }}>
            {agents.length} professionnel{agents.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <SelecteurConseillerAdmin
            conseillers={agents.map((a) => ({ id: a.id, nom_complet: a.nom_complet, role: a.role }))}
          />
          <Link
            href="/admin/agents/nouveau"
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
            style={{ background: "#111", color: "#fff", textDecoration: "none" }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Inviter un agent
          </Link>
        </div>
      </div>

      {/* Recherche */}
      <form method="get" className="flex gap-2 mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Rechercher par nom…"
          className="border rounded-xl px-4 py-2 text-sm flex-1 focus:outline-none"
          style={{ borderColor: "#EBEBEB", color: "#111", background: "#fff", maxWidth: 280 }}
        />
        {q && (
          <Link
            href="/admin/agents"
            className="px-4 py-2 rounded-xl text-sm"
            style={{ background: "#F5F5F5", color: "#777", textDecoration: "none" }}
          >
            Effacer
          </Link>
        )}
        <button
          type="submit"
          className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity"
          style={{ background: "#111", color: "#fff" }}
        >
          Filtrer
        </button>
      </form>

      {/* État vide */}
      {agents.length === 0 && (
        <div
          className="rounded-2xl flex flex-col items-center py-16 text-center"
          style={{ background: "#fff", border: "1px solid #EBEBEB" }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "#F5F5F5" }}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#BBB" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            </svg>
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: "#333" }}>
            {q ? "Aucun agent trouvé" : "Aucun agent enregistré"}
          </p>
          <p className="text-xs mb-4" style={{ color: "#999" }}>
            {q ? "Modifiez votre recherche." : "Invitez le premier agent."}
          </p>
          {!q && (
            <Link
              href="/admin/agents/nouveau"
              className="text-sm font-medium px-4 py-2 rounded-xl"
              style={{ background: "#111", color: "#fff", textDecoration: "none" }}
            >
              Inviter un agent
            </Link>
          )}
        </div>
      )}

      {/* Liste */}
      {agents.length > 0 && (
        <div className="flex flex-col gap-3">
          {agents.map((agent) => {
            const zones   = Array.isArray(agent.zones) ? (agent.zones as string[]) : [];
            const nbBiens = biensParAgent[agent.id] ?? 0;
            const nbLeads = leadsParAgent[agent.id] ?? 0;
            const email   = emailMap[agent.id] ?? "";
            const initiale = (agent.nom_complet ?? "?").charAt(0).toUpperCase();

            return (
              <article
                key={agent.id}
                className="rounded-2xl p-4"
                style={{ background: "#fff", border: "1px solid #EBEBEB" }}
              >
                <div className="flex flex-wrap gap-4 items-start">

                  {/* Avatar + identité */}
                  <div className="flex items-center gap-3 flex-shrink-0 min-w-[160px] sm:min-w-[220px]">
                    {agent.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={agent.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: "#111", color: "#D4AF37" }}
                      >
                        {initiale}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-sm truncate" style={{ color: "#111" }}>
                          {agent.nom_complet ?? "—"}
                        </p>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{ background: "#F5F5F5", color: "#666" }}
                        >
                          {ROLE_LABEL[agent.role] ?? agent.role}
                        </span>
                      </div>
                      {email && (
                        <p className="text-xs truncate" style={{ color: "#888" }}>{email}</p>
                      )}
                      {agent.telephone && (
                        <p className="text-xs" style={{ color: "#888" }}>{agent.telephone}</p>
                      )}
                      <p className="text-xs mt-0.5" style={{ color: "#CCC" }}>
                        Inscrit le {formaterDate(agent.cree_le)}
                      </p>
                    </div>
                  </div>

                  {/* Compteurs */}
                  <div className="flex gap-4 flex-shrink-0">
                    <div className="text-center min-w-[40px] sm:min-w-[52px]">
                      <p className="text-lg font-bold" style={{ color: "#111" }}>{nbBiens}</p>
                      <p className="text-xs" style={{ color: "#BBB" }}>biens</p>
                    </div>
                    <div className="text-center min-w-[40px] sm:min-w-[52px]">
                      <p className="text-lg font-bold" style={{ color: "#111" }}>{nbLeads}</p>
                      <p className="text-xs" style={{ color: "#BBB" }}>leads</p>
                    </div>
                  </div>

                  {/* Zones */}
                  <div className="flex flex-wrap gap-1.5 flex-1 min-w-[140px] items-center">
                    {zones.length === 0 ? (
                      <span className="text-xs" style={{ color: "#CCC" }}>Aucune zone</span>
                    ) : (
                      zones.map((z) => (
                        <span key={z} className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: "#F5F5F5", color: "#555" }}>
                          {z}
                        </span>
                      ))
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/admin/agents/${agent.id}`}
                      className="text-xs px-3 py-1.5 rounded-xl font-medium hover:opacity-80 transition-opacity"
                      style={{ background: "#111", color: "#fff", textDecoration: "none" }}
                    >
                      Voir la fiche →
                    </Link>
                    <ModalZonesAgent
                      agentId={agent.id}
                      nomAgent={agent.nom_complet ?? "—"}
                      zonesInitiales={zones}
                    />
                    <SelectRole id={agent.id} roleActuel={agent.role ?? "agent"} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
