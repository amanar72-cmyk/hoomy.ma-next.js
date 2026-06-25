import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import ActionsLead from "@/components/pro/ActionsLead";
import { changerStatutLeadAdmin } from "@/app/admin/actions";

export const metadata: Metadata = {
  title: "Leads — Administration HOOMY.MA",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type Lead = {
  id: string;
  nom_client: string;
  email_client: string;
  telephone_client: string | null;
  date_souhaitee: string | null;
  message: string | null;
  statut: string;
  cree_le: string;
  agent_id: string | null;
  biens: {
    titre: string;
    reference: string | null;
    ville: string;
    transaction: string;
    photos: string[] | null;
  } | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const BADGE_STATUT: Record<string, { label: string; bg: string; color: string }> = {
  nouvelle:  { label: "Nouveau",  bg: "#DBEAFE", color: "#1E40AF" },
  confirmee: { label: "En cours", bg: "#FEF3C7", color: "#92400E" },
  realisee:  { label: "Traité",   bg: "#D1FAE5", color: "#065F46" },
  annulee:   { label: "Annulé",   bg: "#FEE2E2", color: "#991B1B" },
};

const ONGLETS = [
  { key: "",          label: "Tous"     },
  { key: "nouvelle",  label: "Nouveaux" },
  { key: "confirmee", label: "En cours" },
  { key: "realisee",  label: "Traités"  },
  { key: "annulee",   label: "Annulés"  },
] as const;

function inférerType(lead: Lead): "Visite" | "Message" {
  return lead.date_souhaitee ? "Visite" : "Message";
}

function formaterDate(d: string) {
  return new Date(d).toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "numeric" });
}

// ── searchParams ──────────────────────────────────────────────────────────────

type SearchParams = Promise<{ statut?: string; q?: string }>;

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PageAdminLeads({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const filtreStatut = sp.statut ?? "";
  const q = sp.q?.trim() ?? "";

  const supabase = await createClient();

  // Tous les leads avec bien + agent
  let query = supabase
    .from("demandes_visite")
    .select(
      "id, nom_client, email_client, telephone_client, date_souhaitee, message, statut, cree_le, agent_id, " +
      "biens(titre, reference, ville, transaction, photos)"
    )
    .order("cree_le", { ascending: false });

  if (filtreStatut) query = query.eq("statut", filtreStatut);
  if (q) query = query.ilike("nom_client", `%${q}%`);

  const { data: leadsRaw, count: countFiltre } = await query.limit(100);
  const leads = (leadsRaw ?? []) as unknown as Lead[];

  // Compteurs globaux (sans filtre statut ni q)
  const { data: tousRaw } = await supabase
    .from("demandes_visite")
    .select("statut, agent_id");
  const tous = tousRaw ?? [];

  function compter(s: string) {
    return s === "" ? tous.length : tous.filter((l) => l.statut === s).length;
  }

  // Résoudre les noms d'agents
  const agentIds = [...new Set(leads.map((l) => l.agent_id).filter((id): id is string => !!id))];
  let agentMap: Record<string, string> = {};
  if (agentIds.length > 0) {
    const { data: agents } = await supabase
      .from("profils")
      .select("id, nom_complet")
      .in("id", agentIds);
    agentMap = Object.fromEntries((agents ?? []).map((a) => [a.id, a.nom_complet ?? "—"]));
  }

  const filtersActifs = !!(filtreStatut || q);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">

      {/* En-tête */}
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold mb-0.5" style={{ color: "#111" }}>Leads</h1>
          <p className="text-sm" style={{ color: "#999" }}>
            {tous.length} lead{tous.length !== 1 ? "s" : ""} au total
          </p>
        </div>
      </div>

      {/* Filtres */}
      <form method="get" className="flex flex-wrap gap-2.5 mb-5">
        <input
          name="q"
          defaultValue={q}
          placeholder="Rechercher par nom client…"
          className="border rounded-xl px-4 py-2 text-sm focus:outline-none"
          style={{ borderColor: "#EBEBEB", color: "#111", minWidth: 220, background: "#fff" }}
        />
        {filtersActifs && (
          <Link
            href="/admin/leads"
            className="px-4 py-2 rounded-xl text-sm font-medium"
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
          Rechercher
        </button>
      </form>

      {/* Onglets statut */}
      <div className="flex gap-1 p-1 rounded-2xl mb-5 overflow-x-auto" style={{ background: "#F0F0F0" }}>
        {ONGLETS.map((o) => {
          const actif = filtreStatut === o.key;
          const href = `/admin/leads${o.key ? `?statut=${o.key}` : ""}${q && o.key ? `&q=${q}` : q ? `?q=${q}` : ""}`;
          const nb = compter(o.key);
          return (
            <Link
              key={o.key}
              href={href}
              className="flex-shrink-0 flex items-center gap-1.5 py-2 px-4 rounded-xl text-sm whitespace-nowrap transition-all"
              style={{
                background: actif ? "#fff" : "transparent",
                color: actif ? "#111" : "#888",
                boxShadow: actif ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                textDecoration: "none",
                fontWeight: actif ? 600 : 400,
              }}
            >
              {o.label}
              {nb > 0 && (
                <span
                  className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: actif ? "#111" : "#E0E0E0",
                    color: actif ? "#fff" : "#888",
                  }}
                >
                  {nb}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* État vide */}
      {leads.length === 0 && (
        <div
          className="rounded-2xl flex flex-col items-center py-16 text-center"
          style={{ background: "#fff", border: "1px solid #EBEBEB" }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: "#333" }}>Aucun lead trouvé</p>
          <p className="text-xs" style={{ color: "#999" }}>
            {filtersActifs ? "Modifiez les filtres." : "Les demandes de contact apparaîtront ici."}
          </p>
        </div>
      )}

      {/* Nombre affiché */}
      {leads.length > 0 && countFiltre !== null && (
        <p className="text-xs mb-3" style={{ color: "#BBB" }}>
          {leads.length} résultat{leads.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Liste */}
      {leads.length > 0 && (
        <div className="flex flex-col gap-3">
          {leads.map((lead) => {
            const badge = BADGE_STATUT[lead.statut] ?? { label: lead.statut, bg: "#F5F5F5", color: "#777" };
            const type = inférerType(lead);
            const photo = (lead.biens?.photos as string[] | null)?.[0] ?? null;
            const agentNom = lead.agent_id ? (agentMap[lead.agent_id] ?? null) : null;

            return (
              <article
                key={lead.id}
                className="rounded-2xl overflow-hidden"
                style={{ background: "#fff", border: "1px solid #EBEBEB" }}
              >
                <div className="flex gap-4 p-4">
                  {/* Photo du bien */}
                  <div
                    className="flex-shrink-0 rounded-xl overflow-hidden"
                    style={{ width: 72, height: 56, background: "#F5F5F5" }}
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#CCC" strokeWidth="1.2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Contenu principal */}
                  <div className="flex-1 min-w-0">

                    {/* Bien + badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      {lead.biens?.reference && (
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                          style={{ background: "#F5F5F5", color: "#BBB" }}>
                          {lead.biens.reference}
                        </span>
                      )}
                      <span className="text-xs font-medium truncate max-w-xs" style={{ color: "#555" }}>
                        {lead.biens?.titre ?? "Bien non trouvé"}{lead.biens?.ville ? ` · ${lead.biens.ville}` : ""}
                      </span>
                      <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: "#F5F5F5", color: "#888" }}>
                          {type}
                        </span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                      </div>
                    </div>

                    {/* Client */}
                    <p className="text-sm font-semibold mb-0.5" style={{ color: "#111" }}>
                      {lead.nom_client}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs mb-1" style={{ color: "#888" }}>
                      <a href={`mailto:${lead.email_client}`} style={{ color: "#888" }}>
                        {lead.email_client}
                      </a>
                      {lead.telephone_client && (
                        <a href={`tel:${lead.telephone_client}`} className="font-medium" style={{ color: "#555" }}>
                          {lead.telephone_client}
                        </a>
                      )}
                      <span style={{ color: "#CCC" }}>·</span>
                      <span>{formaterDate(lead.cree_le)}</span>
                    </div>

                    {/* Agent affecté */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#CCC" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                      </svg>
                      <span className="text-xs" style={{ color: agentNom ? "#888" : "#CCC" }}>
                        {agentNom ?? "Aucun agent affecté"}
                      </span>
                    </div>

                    {lead.message && (
                      <p className="text-xs italic mt-1 line-clamp-1" style={{ color: "#AAA" }}>
                        &ldquo;{lead.message}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="px-4 pb-3 pt-2" style={{ borderTop: "1px solid #F5F5F5" }}>
                  <ActionsLead
                    telephone={lead.telephone_client}
                    statut={lead.statut}
                    marquerEnCours={changerStatutLeadAdmin.bind(null, lead.id, "confirmee")}
                    marquerTraite={changerStatutLeadAdmin.bind(null, lead.id, "realisee")}
                    marquerNouvel={changerStatutLeadAdmin.bind(null, lead.id, "nouvelle")}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
