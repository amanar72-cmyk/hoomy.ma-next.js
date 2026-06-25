import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import BoutonAction from "@/components/admin/BoutonAction";
import ModalZonesAgent from "@/components/admin/ModalZonesAgent";
import SelectRole from "@/components/admin/SelectRole";
import { retirerBienAgent } from "@/app/admin/actions";

// ── Types ─────────────────────────────────────────────────────────────────────

type Bien = {
  id: string;
  reference: string | null;
  titre: string;
  type: string;
  transaction: string;
  prix: number;
  ville: string;
  quartier: string | null;
  photos: string[] | null;
  statut: string | null;
  date_affectation: string | null;
};

type Lead = {
  id: string;
  nom_client: string;
  telephone_client: string | null;
  date_souhaitee: string | null;
  statut: string;
  cree_le: string;
  biens: { titre: string; reference: string | null } | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const BADGE_STATUT_BIEN: Record<string, { label: string; bg: string; color: string }> = {
  brouillon:    { label: "Brouillon",    bg: "#F5F5F5", color: "#777" },
  affecte:      { label: "Affecté",      bg: "#EDE9FE", color: "#5B21B6" },
  en_validation:{ label: "En validation",bg: "#FEF3C7", color: "#92400E" },
  finalise:     { label: "Finalisé",     bg: "#D1FAE5", color: "#065F46" },
  transacte:    { label: "Transacté",    bg: "#111",     color: "#fff"   },
};

const BADGE_STATUT_LEAD: Record<string, { label: string; bg: string; color: string }> = {
  nouvelle:  { label: "Nouveau",  bg: "#DBEAFE", color: "#1E40AF" },
  confirmee: { label: "En cours", bg: "#FEF3C7", color: "#92400E" },
  realisee:  { label: "Traité",   bg: "#D1FAE5", color: "#065F46" },
  annulee:   { label: "Annulé",   bg: "#FEE2E2", color: "#991B1B" },
};

const ROLE_LABEL: Record<string, string> = {
  agent:  "Agent",
  agence: "Agence",
};

function formaterPrix(prix: number, transaction: string) {
  const m = prix.toLocaleString("fr-MA");
  return transaction === "location" ? `${m} DH/mois` : `${m} DH`;
}

function formaterDate(d: string) {
  return new Date(d).toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  params: Promise<{ agentId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { agentId } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("profils").select("nom_complet").eq("id", agentId).single();
  return { title: `${data?.nom_complet ?? "Agent"} — Admin HOOMY.MA` };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PageFicheAgent({ params }: Props) {
  const { agentId } = await params;

  const supabase    = await createClient();
  const adminClient = createAdminClient();

  // Profil + email + biens + leads en parallèle
  const [
    { data: agent },
    { data: authUser },
    { data: biensRaw },
    { data: leadsRaw },
  ] = await Promise.all([
    supabase
      .from("profils")
      .select("id, nom_complet, telephone, role, zones, avatar_url, cree_le")
      .eq("id", agentId)
      .single(),
    adminClient.auth.admin.getUserById(agentId),
    supabase
      .from("biens")
      .select("id, reference, titre, type, transaction, prix, ville, quartier, photos, statut, date_affectation")
      .eq("agent_id", agentId)
      .order("date_affectation", { ascending: false }),
    supabase
      .from("demandes_visite")
      .select("id, nom_client, telephone_client, date_souhaitee, statut, cree_le, biens(titre, reference)")
      .eq("agent_id", agentId)
      .order("cree_le", { ascending: false })
      .limit(8),
  ]);

  if (!agent) notFound();

  const email    = authUser?.user?.email ?? "";
  const biens    = (biensRaw ?? []) as unknown as Bien[];
  const leads    = (leadsRaw ?? []) as unknown as Lead[];
  const zones    = Array.isArray(agent.zones) ? (agent.zones as string[]) : [];
  const initiale = (agent.nom_complet ?? "?").charAt(0).toUpperCase();

  const nbVisites = leads.filter((l) => l.date_souhaitee !== null).length;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">

      {/* Breadcrumb */}
      <Link
        href="/admin/agents"
        className="inline-flex items-center gap-1.5 text-xs mb-5 hover:underline"
        style={{ color: "#999", textDecoration: "none" }}
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Agents
      </Link>

      {/* En-tête agent */}
      <div
        className="rounded-2xl p-5 mb-6"
        style={{ background: "#fff", border: "1px solid #EBEBEB" }}
      >
        <div className="flex flex-wrap gap-5 items-start">

          {/* Avatar + infos */}
          <div className="flex items-start gap-4 flex-1 min-w-[220px]">
            {agent.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={agent.avatar_url} alt=""
                className="w-14 h-14 rounded-2xl object-cover flex-shrink-0" />
            ) : (
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0"
                style={{ background: "#111", color: "#D4AF37" }}
              >
                {initiale}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-lg font-semibold" style={{ color: "#111" }}>
                  {agent.nom_complet ?? "—"}
                </h1>
                <span className="text-xs px-2 py-0.5 rounded"
                  style={{ background: "#F5F5F5", color: "#666" }}>
                  {ROLE_LABEL[agent.role] ?? agent.role}
                </span>
              </div>
              {email && (
                <p className="text-sm mb-0.5" style={{ color: "#555" }}>
                  <a href={`mailto:${email}`} style={{ color: "#555" }}>{email}</a>
                </p>
              )}
              {agent.telephone && (
                <p className="text-sm mb-0.5" style={{ color: "#555" }}>
                  <a href={`tel:${agent.telephone}`} style={{ color: "#555" }}>{agent.telephone}</a>
                </p>
              )}
              <p className="text-xs mt-1" style={{ color: "#BBB" }}>
                Inscrit le {formaterDate(agent.cree_le)}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6 flex-shrink-0">
            {[
              { val: biens.length,   label: "biens"    },
              { val: leads.length,   label: "leads"    },
              { val: nbVisites,      label: "visites"  },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold" style={{ color: "#111" }}>{s.val}</p>
                <p className="text-xs" style={{ color: "#BBB" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Actions rapides */}
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            <ModalZonesAgent agentId={agent.id} nomAgent={agent.nom_complet ?? "—"} zonesInitiales={zones} />
            <SelectRole id={agent.id} roleActuel={agent.role ?? "agent"} />
          </div>
        </div>

        {/* Zones */}
        {zones.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4 pt-4" style={{ borderTop: "1px solid #F5F5F5" }}>
            <span className="text-xs mr-1" style={{ color: "#BBB" }}>Zones :</span>
            {zones.map((z) => (
              <span key={z} className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "#F5F5F5", color: "#555" }}>
                {z}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Biens affectés */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold mb-3" style={{ color: "#111" }}>
          Biens affectés
          <span className="ml-2 text-xs font-normal" style={{ color: "#BBB" }}>
            {biens.length} bien{biens.length !== 1 ? "s" : ""}
          </span>
        </h2>

        {biens.length === 0 ? (
          <div className="rounded-2xl py-10 text-center"
            style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
            <p className="text-sm" style={{ color: "#CCC" }}>Aucun bien affecté</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {biens.map((b) => {
              const photo = (b.photos as string[] | null)?.[0] ?? null;
              const badge = BADGE_STATUT_BIEN[b.statut ?? ""] ?? { label: b.statut ?? "—", bg: "#F5F5F5", color: "#777" };
              return (
                <div
                  key={b.id}
                  className="rounded-xl p-3 flex gap-3 items-center flex-wrap"
                  style={{ background: "#fff", border: "1px solid #EBEBEB" }}
                >
                  {/* Photo */}
                  <div className="flex-shrink-0 rounded-lg overflow-hidden"
                    style={{ width: 56, height: 44, background: "#F5F5F5" }}>
                    {photo
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={photo} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#CCC" strokeWidth="1.2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          </svg>
                        </div>
                    }
                  </div>

                  {/* Infos bien */}
                  <div className="flex-1 min-w-[160px]">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      {b.reference && (
                        <span className="text-xs font-mono" style={{ color: "#CCC" }}>{b.reference}</span>
                      )}
                      <span
                        className="text-xs font-medium px-1.5 py-0.5 rounded"
                        style={{ background: badge.bg, color: badge.color }}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <Link
                      href={`/admin/biens/${b.id}`}
                      className="text-sm font-medium hover:underline block"
                      style={{ color: "#111", textDecoration: "none" }}
                    >
                      {b.titre}
                    </Link>
                    <p className="text-xs" style={{ color: "#999" }}>
                      {b.quartier ? `${b.quartier}, ` : ""}{b.ville} · {formaterPrix(b.prix, b.transaction)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <BoutonAction
                      action={retirerBienAgent.bind(null, b.id, true)}
                      label="Réaffecter"
                      labelChargement="…"
                      className="text-xs px-3 py-1.5 rounded-lg font-medium hover:opacity-80 transition-opacity"
                      style={{ background: "#F5F5F5", color: "#555", border: "1px solid #EBEBEB" }}
                      confirmation="Retirer ce bien à l'agent et le remettre dans la file ?"
                    />
                    <BoutonAction
                      action={retirerBienAgent.bind(null, b.id, false)}
                      label="Retirer"
                      labelChargement="…"
                      className="text-xs px-3 py-1.5 rounded-lg border hover:opacity-80 transition-opacity"
                      style={{ borderColor: "#FECACA", color: "#991B1B" }}
                      confirmation="Retirer ce bien à l'agent sans le remettre en file ?"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Leads récents */}
      <section>
        <h2 className="text-sm font-semibold mb-3" style={{ color: "#111" }}>
          Leads récents
          <span className="ml-2 text-xs font-normal" style={{ color: "#BBB" }}>
            {leads.length} lead{leads.length !== 1 ? "s" : ""} affichés
          </span>
        </h2>

        {leads.length === 0 ? (
          <div className="rounded-2xl py-10 text-center"
            style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
            <p className="text-sm" style={{ color: "#CCC" }}>Aucun lead</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {leads.map((lead) => {
              const badge = BADGE_STATUT_LEAD[lead.statut] ?? { label: lead.statut, bg: "#F5F5F5", color: "#777" };
              return (
                <div
                  key={lead.id}
                  className="rounded-xl px-4 py-3 flex flex-wrap gap-3 items-center"
                  style={{ background: "#fff", border: "1px solid #EBEBEB" }}
                >
                  <div className="flex-1 min-w-[160px]">
                    <p className="text-sm font-medium mb-0.5" style={{ color: "#111" }}>
                      {lead.nom_client}
                    </p>
                    <p className="text-xs" style={{ color: "#999" }}>
                      {lead.biens?.reference
                        ? <span className="font-mono mr-1.5" style={{ color: "#CCC" }}>{lead.biens.reference}</span>
                        : null}
                      {lead.biens?.titre ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {lead.date_souhaitee && (
                      <span className="text-xs px-2 py-0.5 rounded"
                        style={{ background: "#F5F5F5", color: "#888" }}>
                        Visite · {formaterDate(lead.date_souhaitee)}
                      </span>
                    )}
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                    <span className="text-xs" style={{ color: "#CCC" }}>
                      {formaterDate(lead.cree_le)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {leads.length >= 8 && (
          <p className="text-xs text-center mt-3" style={{ color: "#BBB" }}>
            Les 8 plus récents · Voir tous dans{" "}
            <Link href="/admin/leads" style={{ color: "#555" }}>Leads</Link>
          </p>
        )}
      </section>
    </div>
  );
}
