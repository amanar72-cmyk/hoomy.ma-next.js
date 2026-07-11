import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatPhoneMaroc } from "@/lib/utils/telephone";
import ActionsLeadQualifie, { type ConseillerLead } from "@/components/admin/leads/ActionsLeadQualifie";
import ErreurChargement from "@/components/ui/ErreurChargement";

// File d'affectation des LEADS — tous les leads statut='nouveau', triés par
// score (chaud en haut) puis par ancienneté (les plus anciens d'abord : un
// lead chaud qui attend est prioritaire). L'affectation réutilise l'action
// existante : agent_id + passage automatique du statut à 'transmis' → le lead
// sort de la file. « Converti » / « Perdu » restent accessibles via le statut.
// NB : /admin/affectation est la file des BIENS — celle-ci est dédiée aux leads.

export const dynamic = "force-dynamic";

type LeadFile = {
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
  bien_id: string | null;
  bien_ref: string | null;
  contact_id: string | null;
  score: string | null;
  statut: string;
  agent_id: string | null;
  notes_interne: string | null;
  biens: { titre: string } | null;
  contacts: { nom: string | null; prenom: string | null } | null;
};

const SCORES: Record<string, { label: string; bg: string; color: string }> = {
  chaud: { label: "🔥 Chaud", bg: "#D4AF37", color: "#0F4C3A" },
  tiede: { label: "Tiède", bg: "#FEF3C7", color: "#92400E" },
  froid: { label: "Froid", bg: "#E5E7EB", color: "#4B5563" },
};
const ORDRE_SCORE: Record<string, number> = { chaud: 0, tiede: 1, froid: 2 };

const LABEL_SOURCE: Record<string, string> = {
  site: "Site", fiche_bien: "Fiche bien", accueil: "Accueil",
  estimation: "Estimation", meta_ads: "Meta Ads", whatsapp: "WhatsApp",
};

const LABEL_TYPE: Record<string, string> = { achat: "Achat", location: "Location", vente: "Vente" };

function attenteDepuis(iso: string): string {
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const j = Math.floor(h / 24);
  return `${j} j`;
}

export default async function PageFileAffectationLeads() {
  const supabase = await createClient();

  const [{ data: raw, error: erreurListe }, { data: tousRaw }, { data: agentsRaw }] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, cree_le, nom, telephone, email, type_projet, budget, zones, message, " +
        "source, campagne, bien_id, bien_ref, contact_id, score, statut, agent_id, " +
        "notes_interne, biens(titre), contacts(nom, prenom)"
      )
      .eq("statut", "nouveau")
      .order("cree_le", { ascending: true })
      .limit(200),
    supabase.from("leads").select("statut, agent_id"),
    supabase.from("profils").select("id, nom_complet, zones, role").in("role", ["agent", "agence"]).order("nom_complet"),
  ]);

  // Tri : score (chaud → froid) puis ancienneté (déjà triés par date en SQL)
  const leads = ((raw ?? []) as unknown as LeadFile[]).sort(
    (a, b) => (ORDRE_SCORE[a.score ?? "froid"] ?? 3) - (ORDRE_SCORE[b.score ?? "froid"] ?? 3)
  );

  // Charge des conseillers (leads affectés non clos) — même calcul que le dashboard
  const tous = (tousRaw ?? []) as { statut: string; agent_id: string | null }[];
  const chargeParAgent: Record<string, number> = {};
  for (const l of tous) {
    if (l.agent_id && !["converti", "perdu"].includes(l.statut)) {
      chargeParAgent[l.agent_id] = (chargeParAgent[l.agent_id] ?? 0) + 1;
    }
  }
  const conseillers: ConseillerLead[] = ((agentsRaw ?? []) as {
    id: string; nom_complet: string | null; zones: string[] | null;
  }[]).map((a) => ({
    id: a.id,
    nom_complet: a.nom_complet,
    zones: a.zones,
    nbLeadsActifs: chargeParAgent[a.id] ?? 0,
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold mb-0.5" style={{ color: "#111" }}>
            File d&apos;affectation
          </h1>
          <p className="text-sm" style={{ color: "#999" }}>
            {leads.length} lead{leads.length !== 1 ? "s" : ""} à affecter · chauds en premier
          </p>
        </div>
        <Link
          href="/admin/leads"
          className="text-xs font-semibold px-3.5 py-2 rounded-xl"
          style={{ background: "#fff", color: "#0F4C3A", border: "1px solid #E8E8E8", textDecoration: "none" }}
        >
          ← Tous les leads
        </Link>
      </div>

      {/* ── Erreur de chargement (jamais silencieuse) ────────────────────── */}
      {erreurListe && (
        <ErreurChargement
          titre="Impossible de charger la file d'affectation"
          detail={erreurListe.message}
        />
      )}

      {/* ── File ─────────────────────────────────────────────────────────── */}
      {!erreurListe && leads.length === 0 ? (
        <div
          className="rounded-2xl px-6 py-14 text-center"
          style={{ background: "#fff", border: "1px solid #EBEBEB" }}
        >
          <p className="text-2xl mb-2">✓</p>
          <p className="text-sm font-medium" style={{ color: "#0F4C3A" }}>
            Aucun lead en attente d&apos;affectation
          </p>
          <p className="text-xs mt-1" style={{ color: "#9DB8AD" }}>
            Les nouveaux leads (site, Meta, WhatsApp) apparaîtront ici automatiquement.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => {
            const score = SCORES[lead.score ?? ""] ?? null;
            const tel = formatPhoneMaroc(lead.telephone);
            // Nom affiché : la fiche contact fait foi, le lead en secours
            const nomContact = lead.contacts
              ? [lead.contacts.prenom, lead.contacts.nom].filter(Boolean).join(" ") || lead.nom
              : lead.nom;

            return (
              <div
                key={lead.id}
                className="rounded-2xl px-4 sm:px-5 py-4"
                style={{
                  background: "#fff",
                  border: lead.score === "chaud" ? "1px solid rgba(212,175,55,0.55)" : "1px solid #EBEBEB",
                  boxShadow: lead.score === "chaud" ? "0 4px 20px rgba(212,175,55,0.12)" : "none",
                }}
              >
                {/* Ligne 1 : identité + badges */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-1.5">
                  {lead.contact_id ? (
                    <Link
                      href={`/admin/contacts/${lead.contact_id}`}
                      className="text-sm font-semibold hover:underline"
                      style={{ color: "#0F4C3A", textDecoration: "none" }}
                    >
                      {nomContact}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold" style={{ color: "#0F4C3A" }}>{nomContact}</span>
                  )}

                  {score && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: score.bg, color: score.color }}>
                      {score.label}
                    </span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#F0EDE5", color: "#6B7A71" }}>
                    {LABEL_TYPE[lead.type_projet] ?? lead.type_projet}
                  </span>
                  <span className="text-xs" style={{ color: "#9DB8AD" }}>
                    {LABEL_SOURCE[lead.source] ?? lead.source}
                    {lead.campagne ? ` · ${lead.campagne}` : ""}
                  </span>
                  <span className="text-xs ml-auto whitespace-nowrap" style={{ color: "#C4A94E" }}>
                    en attente depuis {attenteDepuis(lead.cree_le)}
                  </span>
                </div>

                {/* Ligne 2 : téléphone · bien · budget/zones */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 text-xs" style={{ color: "#666" }}>
                  <span className="tabular-nums">{tel.affichage || lead.telephone}</span>
                  {lead.bien_id ? (
                    <Link
                      href={`/admin/biens/${lead.bien_id}`}
                      className="hover:underline font-medium"
                      style={{ color: "#A07C1E", textDecoration: "none" }}
                    >
                      🏠 {lead.biens?.titre ?? lead.bien_ref ?? "Voir le bien"}
                    </Link>
                  ) : lead.bien_ref ? (
                    <span style={{ color: "#A07C1E" }}>🏠 Réf. {lead.bien_ref} (non trouvée)</span>
                  ) : null}
                  {lead.budget && <span>Budget : {lead.budget}</span>}
                  {(lead.zones ?? []).length > 0 && <span>Zones : {(lead.zones ?? []).join(", ")}</span>}
                </div>

                {lead.message && (
                  <p className="text-xs italic mb-3 line-clamp-2" style={{ color: "#8A8A8A" }}>
                    « {lead.message} »
                  </p>
                )}

                {/* Actions : Appeler / WhatsApp / statut / AFFECTER / notes */}
                <ActionsLeadQualifie
                  leadId={lead.id}
                  nom={nomContact}
                  telephone={lead.telephone}
                  statut={lead.statut}
                  agentId={lead.agent_id}
                  agentNom={null}
                  notesInterne={lead.notes_interne}
                  zonesLead={lead.zones ?? []}
                  conseillers={conseillers}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
