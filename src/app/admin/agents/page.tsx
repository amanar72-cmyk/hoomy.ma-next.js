import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import ModalZonesAgent from "@/components/admin/ModalZonesAgent";
import SelectRole from "@/components/admin/SelectRole";

type SearchParams = Promise<{ q?: string }>;

export default async function PageAdminAgents({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("profils")
    .select("id, nom_complet, telephone, role, zones, avatar_url, cree_le", { count: "exact" })
    .in("role", ["agent", "agence"])
    .order("nom_complet", { ascending: true });

  if (sp.q) query = query.ilike("nom_complet", `%${sp.q}%`);

  const { data: agents, count } = await query.limit(200);

  // Nombre de biens affectés par agent
  const agentIds = (agents ?? []).map((a) => a.id);
  let biensParAgent: Record<string, number> = {};
  if (agentIds.length > 0) {
    const { data: biens } = await supabase
      .from("biens")
      .select("agent_id")
      .in("agent_id", agentIds)
      .eq("statut", "affecte");
    (biens ?? []).forEach((b) => {
      const aid = b.agent_id as string;
      biensParAgent[aid] = (biensParAgent[aid] ?? 0) + 1;
    });
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl mb-1"
            style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}>
            Agents & Agences
          </h1>
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            {count ?? 0} professionnel{(count ?? 0) > 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/agents/nouveau"
          className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          style={{ background: "#0F4C3A", color: "#fff", textDecoration: "none" }}
        >
          <span>+</span> Ajouter un agent
        </Link>
      </div>

      {/* Filtre recherche */}
      <form method="get" className="flex gap-3 mb-6">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Rechercher par nom…"
          className="border rounded-xl px-4 py-2 text-sm"
          style={{ borderColor: "#E0DAC8", color: "#0F4C3A", minWidth: 220 }} />
        <button type="submit"
          className="px-5 py-2 rounded-xl text-sm font-medium cursor-pointer"
          style={{ background: "#0F4C3A", color: "#fff" }}>
          Filtrer
        </button>
      </form>

      {(agents ?? []).length === 0 ? (
        <div className="text-center py-16" style={{ color: "#9DB8AD" }}>Aucun agent trouvé.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {(agents ?? []).map((a) => {
            const zones: string[] = Array.isArray(a.zones) ? (a.zones as string[]) : [];
            const nbBiens = biensParAgent[a.id] ?? 0;

            return (
              <div key={a.id} className="rounded-2xl border p-4 flex flex-wrap gap-4 items-center"
                style={{ background: "#fff", borderColor: "#F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.05)" }}>

                {/* Avatar + identité */}
                <div className="flex items-center gap-3 flex-shrink-0" style={{ minWidth: 200 }}>
                  {a.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: "#0F4C3A", color: "#D4AF37" }}>
                      {(a.nom_complet ?? "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-sm" style={{ color: "#1f2a24" }}>
                      {a.nom_complet ?? "—"}
                    </p>
                    <p className="text-xs" style={{ color: "#9DB8AD" }}>
                      {a.telephone ?? "Pas de téléphone"}
                    </p>
                  </div>
                </div>

                {/* Zones */}
                <div className="flex flex-wrap gap-1.5 flex-1 min-w-[160px]">
                  {zones.length === 0 ? (
                    <span className="text-xs" style={{ color: "#C4D8CE" }}>Aucune zone</span>
                  ) : (
                    zones.map((z) => (
                      <span key={z} className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "#E8F5ED", color: "#0F4C3A" }}>
                        {z}
                      </span>
                    ))
                  )}
                </div>

                {/* Biens affectés */}
                <div className="text-center flex-shrink-0" style={{ minWidth: 70 }}>
                  <p className="text-xl font-semibold" style={{ color: "#0F4C3A" }}>{nbBiens}</p>
                  <p className="text-xs" style={{ color: "#9DB8AD" }}>biens affectés</p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                  <ModalZonesAgent
                    agentId={a.id}
                    nomAgent={a.nom_complet ?? "—"}
                    zonesInitiales={zones}
                  />
                  <Link
                    href={`/admin/agents/${a.id}`}
                    className="text-xs px-2.5 py-1 rounded-lg border cursor-pointer"
                    style={{ borderColor: "#E0DAC8", color: "#0F4C3A" }}>
                    Voir biens
                  </Link>
                  <SelectRole id={a.id} roleActuel={a.role ?? "agent"} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
