import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import ActionsLead from "@/components/pro/ActionsLead";
import ActionsLeadAffecte from "@/components/pro/ActionsLeadAffecte";
import ErreurChargement from "@/components/ui/ErreurChargement";
import { changerStatutLead } from "@/app/pro/actions";
import { formatPhoneMaroc } from "@/lib/utils/telephone";

export const metadata: Metadata = {
  title: "Leads — Espace Pro HOOMY.MA",
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
  nouvelle:  { label: "Nouveau",   bg: "#DBEAFE", color: "#1E40AF" },
  confirmee: { label: "En cours",  bg: "#FEF3C7", color: "#92400E" },
  realisee:  { label: "Traité",    bg: "#D1FAE5", color: "#065F46" },
  annulee:   { label: "Annulé",    bg: "#FEE2E2", color: "#991B1B" },
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

// ── Leads qualifiés affectés (table public.leads) ─────────────────────────────

type LeadAffecte = {
  id: string;
  cree_le: string;
  nom: string;
  telephone: string;
  email: string | null;
  type_projet: string;
  budget: string | null;
  zones: string[] | null;
  message: string | null;
  source: string;
  campagne: string | null;
  score: string | null;
  statut: string;
  biens: { titre: string; slug: string | null; transaction: string } | null;
};

const SCORES_LEAD: Record<string, { label: string; bg: string; color: string }> = {
  chaud: { label: "🔥 Chaud", bg: "#D4AF37", color: "#0F4C3A" },
  tiede: { label: "Tiède", bg: "#FEF3C7", color: "#92400E" },
  froid: { label: "Froid", bg: "#E5E7EB", color: "#4B5563" },
};

const LABEL_TYPE_PROJET: Record<string, string> = { achat: "Achat", location: "Location", vente: "Vente" };

function formaterDate(d: string) {
  return new Date(d).toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "numeric" });
}

// ── searchParams ──────────────────────────────────────────────────────────────

type SearchParams = Promise<{ statut?: string }>;

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PageProLeads({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const filtreStatut = sp.statut ?? "";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  // Leads des biens affectés à cet agent uniquement
  let query = supabase
    .from("demandes_visite")
    .select(
      "id, nom_client, email_client, telephone_client, date_souhaitee, message, statut, cree_le, " +
      "biens(titre, reference, ville, transaction, photos)"
    )
    .eq("agent_id", user.id)
    .order("cree_le", { ascending: false });

  if (filtreStatut) query = query.eq("statut", filtreStatut);

  const { data: leadsRaw } = await query;
  const leads = (leadsRaw ?? []) as unknown as Lead[];

  // ── Leads qualifiés AFFECTÉS à cet agent (table leads) ────────────────────
  // Lecture via service_role avec filtre agent_id imposé côté serveur : la RLS
  // de la table leads ne donne pas d'accès direct aux agents. On n'affiche que
  // les leads encore actifs (ni convertis ni perdus).
  const adminClient = createAdminClient();
  const { data: affectesRaw, error: erreurAffectes } = await adminClient
    .from("leads")
    .select(
      "id, cree_le, nom, telephone, email, type_projet, budget, zones, message, " +
      "source, campagne, score, statut, biens(titre, slug, transaction)"
    )
    .eq("agent_id", user.id)
    .not("statut", "in", "(converti,perdu)")
    .order("cree_le", { ascending: false });
  const affectes = (affectesRaw ?? []) as unknown as LeadAffecte[];

  // Compteurs par statut (sur tous les leads sans filtre)
  const { data: tousRaw } = await supabase
    .from("demandes_visite")
    .select("statut")
    .eq("agent_id", user.id);
  const tous = tousRaw ?? [];

  function compter(s: string) {
    return s === "" ? tous.length : tous.filter((l) => l.statut === s).length;
  }

  return (
    <div className="max-w-4xl mx-auto">

      {/* En-tête */}
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold mb-0.5" style={{ color: "#111" }}>Leads</h1>
          <p className="text-sm" style={{ color: "#999" }}>
            {tous.length} lead{tous.length !== 1 ? "s" : ""} au total
          </p>
        </div>
      </div>

      {/* ══ Leads qualifiés affectés par HOOMY (file d'affectation admin) ══ */}
      {erreurAffectes && (
        <ErreurChargement
          titre="Impossible de charger vos leads affectés"
          detail={erreurAffectes.message}
        />
      )}
      {affectes.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "#0F4C3A" }}>
              Leads qui me sont affectés
            </h2>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: "#D4AF37", color: "#0F4C3A" }}
            >
              {affectes.length}
            </span>
          </div>

          <div className="space-y-3">
            {affectes.map((l) => {
              const score = SCORES_LEAD[l.score ?? ""];
              const telA = formatPhoneMaroc(l.telephone);
              return (
                <div
                  key={l.id}
                  className="rounded-2xl px-4 sm:px-5 py-4"
                  style={{
                    background: "#fff",
                    border: l.score === "chaud" ? "1px solid rgba(212,175,55,0.55)" : "1px solid #EBEBEB",
                    boxShadow: l.score === "chaud" ? "0 4px 20px rgba(212,175,55,0.10)" : "none",
                  }}
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-1.5">
                    <span className="text-sm font-semibold" style={{ color: "#0F4C3A" }}>{l.nom}</span>
                    {score && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: score.bg, color: score.color }}>
                        {score.label}
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#F0EDE5", color: "#6B7A71" }}>
                      {LABEL_TYPE_PROJET[l.type_projet] ?? l.type_projet}
                    </span>
                    <span className="text-xs ml-auto" style={{ color: "#BBB" }}>{formaterDate(l.cree_le)}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 text-xs" style={{ color: "#666" }}>
                    <span className="tabular-nums">{telA.affichage ?? l.telephone}</span>
                    {l.biens && (
                      <Link
                        href={`/${l.biens.transaction === "location" ? "louer" : "acheter"}/${l.biens.slug ?? ""}`}
                        target="_blank"
                        className="hover:underline font-medium"
                        style={{ color: "#A07C1E", textDecoration: "none" }}
                      >
                        🏠 {l.biens.titre}
                      </Link>
                    )}
                    {l.budget && <span>Budget : {l.budget}</span>}
                    {(l.zones ?? []).length > 0 && <span>Zones : {(l.zones ?? []).join(", ")}</span>}
                  </div>

                  {l.message && (
                    <p className="text-xs italic mb-3 line-clamp-2" style={{ color: "#8A8A8A" }}>
                      « {l.message} »
                    </p>
                  )}

                  <ActionsLeadAffecte
                    leadId={l.id}
                    nom={l.nom}
                    telephone={l.telephone}
                    statut={l.statut}
                  />
                </div>
              );
            })}
          </div>

          <h2 className="text-sm font-semibold uppercase tracking-wide mt-8 mb-1" style={{ color: "#0F4C3A" }}>
            Demandes de visite &amp; messages
          </h2>
        </div>
      )}

      {/* Onglets statut */}
      <div className="flex gap-1 p-1 rounded-2xl mb-6 overflow-x-auto" style={{ background: "#F0F0F0" }}>
        {ONGLETS.map((o) => {
          const actif = filtreStatut === o.key;
          const href = `/pro/leads${o.key ? `?statut=${o.key}` : ""}`;
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
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "#F5F5F5" }}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#BBB" strokeWidth="1.5">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.4 2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: "#333" }}>
            Aucun lead{filtreStatut ? ` dans cette catégorie` : ""}
          </p>
          <p className="text-xs" style={{ color: "#999" }}>
            Les demandes de contact apparaîtront ici.
          </p>
        </div>
      )}

      {/* Liste */}
      {leads.length > 0 && (
        <div className="flex flex-col gap-3">
          {leads.map((lead) => {
            const badge = BADGE_STATUT[lead.statut] ?? { label: lead.statut, bg: "#F5F5F5", color: "#777" };
            const type = inférerType(lead);
            const photo = (lead.biens?.photos as string[] | null)?.[0] ?? null;

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

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">

                    {/* Bien + badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      {lead.biens?.reference && (
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                          style={{ background: "#F5F5F5", color: "#BBB" }}>
                          {lead.biens.reference}
                        </span>
                      )}
                      <span className="text-xs font-medium truncate" style={{ color: "#555" }}>
                        {lead.biens?.titre ?? "Bien non trouvé"}{lead.biens?.ville ? ` · ${lead.biens.ville}` : ""}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full ml-auto flex-shrink-0"
                        style={{ background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: "#F5F5F5", color: "#888" }}>
                        {type}
                      </span>
                    </div>

                    {/* Client */}
                    <p className="text-sm font-semibold mb-0.5" style={{ color: "#111" }}>
                      {lead.nom_client}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs mb-1.5" style={{ color: "#888" }}>
                      <span>{lead.email_client}</span>
                      {lead.telephone_client && <span>{lead.telephone_client}</span>}
                      <span style={{ color: "#CCC" }}>·</span>
                      <span>{formaterDate(lead.cree_le)}</span>
                    </div>

                    {lead.message && (
                      <p className="text-xs italic line-clamp-1" style={{ color: "#AAA" }}>
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
                    marquerEnCours={changerStatutLead.bind(null, lead.id, "confirmee")}
                    marquerTraite={changerStatutLead.bind(null, lead.id, "realisee")}
                    marquerNouvel={changerStatutLead.bind(null, lead.id, "nouvelle")}
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
