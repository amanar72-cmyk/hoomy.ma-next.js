import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPhoneMaroc } from "@/lib/utils/telephone";
import { normalizePhone } from "@/lib/leads/upsert";
import ErreurChargement from "@/components/ui/ErreurChargement";

// Fiche CONTACT (CRM admin) — identité + historique complet :
// tous ses leads (rattachés par contact_id ET par téléphone, pour couvrir les
// leads antérieurs à la table contacts) et ses demandes de visite (téléphone),
// chaque entrée pointant vers SON bien (/admin/biens/[id]).
// Lecture via service_role : la table contacts est fermée en RLS, et la page
// est servie derrière la garde admin du layout /admin.

export const dynamic = "force-dynamic";

type Contact = {
  id: string;
  nom: string | null;
  prenom: string | null;
  telephone: string;
  email: string | null;
  cree_le: string;
};

type LeadContact = {
  id: string;
  cree_le: string;
  nom: string;
  type_projet: string;
  budget: string | null;
  source: string;
  campagne: string | null;
  bien_id: string | null;
  bien_ref: string | null;
  message: string | null;
  score: string | null;
  statut: string;
  agent_id: string | null;
  biens: { titre: string } | null;
};

type DemandeContact = {
  id: string;
  cree_le: string;
  date_souhaitee: string | null;
  message: string | null;
  statut: string;
  bien_id: string | null;
  biens: { titre: string; reference: string | null } | null;
};

const SCORES: Record<string, { label: string; bg: string; color: string }> = {
  chaud: { label: "🔥 Chaud", bg: "#D4AF37", color: "#0F4C3A" },
  tiede: { label: "Tiède", bg: "#FEF3C7", color: "#92400E" },
  froid: { label: "Froid", bg: "#E5E7EB", color: "#4B5563" },
};

const STATUTS_LEAD: Record<string, { label: string; bg: string; color: string }> = {
  nouveau: { label: "À affecter", bg: "#FEE2E2", color: "#991B1B" },
  contacte: { label: "Contacté", bg: "#DBEAFE", color: "#1E40AF" },
  qualifie: { label: "Qualifié", bg: "#E0E7FF", color: "#3730A3" },
  transmis: { label: "Affecté", bg: "#FEF3C7", color: "#92400E" },
  converti: { label: "Converti ✓", bg: "#D1FAE5", color: "#064E3B" },
  perdu: { label: "Perdu", bg: "#F3F4F6", color: "#6B7280" },
};

const STATUTS_DEMANDE: Record<string, { label: string; bg: string; color: string }> = {
  nouvelle: { label: "Nouvelle", bg: "#FEE2E2", color: "#991B1B" },
  confirmee: { label: "Confirmée", bg: "#D1FAE5", color: "#064E3B" },
  annulee: { label: "Annulée", bg: "#F3F4F6", color: "#6B7280" },
};

const LABEL_SOURCE: Record<string, string> = {
  site: "Site", fiche_bien: "Fiche bien", accueil: "Accueil",
  estimation: "Estimation", meta_ads: "Meta Ads", whatsapp: "WhatsApp",
};

const LABEL_TYPE: Record<string, string> = { achat: "Achat", location: "Location", vente: "Vente" };

function dateFr(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "numeric" });
}

/** Variantes d'un numéro pour matcher les lignes antérieures à la normalisation. */
function variantesTelephone(brut: string): string[] {
  const v = new Set<string>([brut]);
  const norm = normalizePhone(brut);
  if (norm) {
    v.add(norm);                               // +212611223344
    if (norm.startsWith("+212")) {
      v.add(norm.slice(1));                    // 212611223344
      v.add(`0${norm.slice(4)}`);              // 0611223344
    }
  }
  return [...v];
}

type Props = { params: Promise<{ id: string }> };

export default async function PageFicheContact({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const admin = createAdminClient();

  const { data: contactRaw } = await admin
    .from("contacts")
    .select("id, nom, prenom, telephone, email, cree_le")
    .eq("id", id)
    .maybeSingle();
  if (!contactRaw) notFound();
  const contact = contactRaw as Contact;

  const tels = variantesTelephone(contact.telephone);
  const CHAMPS_LEAD =
    "id, cree_le, nom, type_projet, budget, source, campagne, bien_id, bien_ref, " +
    "message, score, statut, agent_id, biens(titre)";

  // Leads par contact_id ET par téléphone (fusionnés) + demandes de visite.
  // Les erreurs sont LUES et affichées — jamais déguisées en historique vide.
  const [
    { data: leadsParContact, error: e1 },
    { data: leadsParTel, error: e2 },
    { data: demandesRaw, error: e3 },
  ] = await Promise.all([
    admin.from("leads").select(CHAMPS_LEAD).eq("contact_id", contact.id),
    admin.from("leads").select(CHAMPS_LEAD).in("telephone", tels),
    admin
      .from("demandes_visite")
      .select("id, cree_le, date_souhaitee, message, statut, bien_id, biens(titre, reference)")
      .in("telephone_client", tels),
  ]);
  const erreurHistorique = e1 ?? e2 ?? e3 ?? null;

  const parId = new Map<string, LeadContact>();
  for (const l of [...(leadsParContact ?? []), ...(leadsParTel ?? [])] as unknown as LeadContact[]) {
    parId.set(l.id, l);
  }
  const leads = [...parId.values()].sort(
    (a, b) => new Date(b.cree_le).getTime() - new Date(a.cree_le).getTime()
  );
  const demandes = ((demandesRaw ?? []) as unknown as DemandeContact[]).sort(
    (a, b) => new Date(b.cree_le).getTime() - new Date(a.cree_le).getTime()
  );

  const nomComplet = [contact.prenom, contact.nom].filter(Boolean).join(" ") || "Contact sans nom";
  const initiales = nomComplet.split(/\s+/).map((m) => m[0]).slice(0, 2).join("").toUpperCase();
  const tel = formatPhoneMaroc(contact.telephone);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">

      {/* ── Fil de retour ────────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center gap-2 text-xs">
        <Link href="/admin/leads" className="hover:underline" style={{ color: "#0F4C3A", textDecoration: "none" }}>
          Leads
        </Link>
        <span style={{ color: "#C9C9C9" }}>›</span>
        <Link href="/admin/leads/file" className="hover:underline" style={{ color: "#0F4C3A", textDecoration: "none" }}>
          File d&apos;affectation
        </Link>
        <span style={{ color: "#C9C9C9" }}>›</span>
        <span style={{ color: "#999" }}>Fiche contact</span>
      </div>

      {/* ── Carte identité ───────────────────────────────────────────────── */}
      <div
        className="rounded-2xl px-5 py-5 mb-6 flex flex-wrap items-center gap-4"
        style={{ background: "#fff", border: "1px solid #EBEBEB" }}
      >
        <span
          className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
          style={{ background: "#0F4C3A", color: "#D4AF37" }}
        >
          {initiales}
        </span>

        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold" style={{ color: "#111" }}>{nomComplet}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm" style={{ color: "#666" }}>
            <span className="tabular-nums">{tel.affichage ?? contact.telephone}</span>
            {contact.email && <span className="truncate">{contact.email}</span>}
            <span className="text-xs" style={{ color: "#9DB8AD" }}>
              Contact depuis le {dateFr(contact.cree_le)}
            </span>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="flex items-center gap-2">
          {tel.lienTel && (
            <a
              href={`tel:${tel.lienTel}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl"
              style={{ background: "#0F4C3A", color: "#fff", textDecoration: "none" }}
            >
              Appeler
            </a>
          )}
          {tel.numeroWA && (
            <a
              href={`https://wa.me/${tel.numeroWA}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl"
              style={{ background: "#25D366", color: "#fff", textDecoration: "none" }}
            >
              WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* ── Erreur de chargement (jamais silencieuse) ────────────────────── */}
      {erreurHistorique && (
        <ErreurChargement
          titre="Impossible de charger l'historique du contact"
          detail={erreurHistorique.message}
        />
      )}

      {/* ── Leads ────────────────────────────────────────────────────────── */}
      <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "#0F4C3A" }}>
        Leads ({leads.length})
      </h2>
      {leads.length === 0 ? (
        <p className="text-sm mb-8" style={{ color: "#9DB8AD" }}>Aucun lead pour ce contact.</p>
      ) : (
        <div className="space-y-2.5 mb-8">
          {leads.map((l) => {
            const score = SCORES[l.score ?? ""];
            const statut = STATUTS_LEAD[l.statut] ?? { label: l.statut, bg: "#F3F4F6", color: "#6B7280" };
            return (
              <div
                key={l.id}
                className="rounded-2xl px-4 py-3.5"
                style={{ background: "#fff", border: "1px solid #EBEBEB" }}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="text-xs font-medium whitespace-nowrap" style={{ color: "#999" }}>
                    {dateFr(l.cree_le)}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#F0EDE5", color: "#6B7A71" }}>
                    {LABEL_TYPE[l.type_projet] ?? l.type_projet}
                  </span>
                  {score && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: score.bg, color: score.color }}>
                      {score.label}
                    </span>
                  )}
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: statut.bg, color: statut.color }}>
                    {statut.label}
                  </span>
                  <span className="text-xs" style={{ color: "#9DB8AD" }}>
                    {LABEL_SOURCE[l.source] ?? l.source}
                    {l.campagne ? ` · ${l.campagne}` : ""}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs" style={{ color: "#666" }}>
                  {l.bien_id ? (
                    <Link
                      href={`/admin/biens/${l.bien_id}`}
                      className="hover:underline font-medium"
                      style={{ color: "#A07C1E", textDecoration: "none" }}
                    >
                      🏠 {l.biens?.titre ?? l.bien_ref ?? "Voir le bien"}
                    </Link>
                  ) : l.bien_ref ? (
                    <span style={{ color: "#A07C1E" }}>🏠 Réf. {l.bien_ref} (non trouvée)</span>
                  ) : (
                    <span style={{ color: "#BBB" }}>Sans bien précis</span>
                  )}
                  {l.budget && <span>Budget : {l.budget}</span>}
                </div>

                {l.message && (
                  <p className="text-xs italic mt-1.5 line-clamp-2" style={{ color: "#8A8A8A" }}>
                    « {l.message} »
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Demandes de visite ───────────────────────────────────────────── */}
      <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "#0F4C3A" }}>
        Demandes de visite ({demandes.length})
      </h2>
      {demandes.length === 0 ? (
        <p className="text-sm" style={{ color: "#9DB8AD" }}>Aucune demande de visite pour ce contact.</p>
      ) : (
        <div className="space-y-2.5">
          {demandes.map((d) => {
            const statut = STATUTS_DEMANDE[d.statut] ?? { label: d.statut, bg: "#F3F4F6", color: "#6B7280" };
            return (
              <div
                key={d.id}
                className="rounded-2xl px-4 py-3.5"
                style={{ background: "#fff", border: "1px solid #EBEBEB" }}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="text-xs font-medium whitespace-nowrap" style={{ color: "#999" }}>
                    {dateFr(d.cree_le)}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: statut.bg, color: statut.color }}>
                    {statut.label}
                  </span>
                  {d.date_souhaitee && (
                    <span className="text-xs" style={{ color: "#666" }}>
                      Visite souhaitée : {dateFr(d.date_souhaitee)}
                    </span>
                  )}
                  {d.bien_id && (
                    <Link
                      href={`/admin/biens/${d.bien_id}`}
                      className="text-xs hover:underline font-medium"
                      style={{ color: "#A07C1E", textDecoration: "none" }}
                    >
                      🏠 {d.biens?.titre ?? d.biens?.reference ?? "Voir le bien"}
                    </Link>
                  )}
                </div>
                {d.message && (
                  <p className="text-xs italic mt-1.5 line-clamp-2" style={{ color: "#8A8A8A" }}>
                    « {d.message} »
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
