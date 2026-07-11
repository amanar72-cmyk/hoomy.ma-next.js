import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import ActionsLeadQualifie, { type ConseillerLead } from "@/components/admin/leads/ActionsLeadQualifie";
import { formatPhoneMaroc } from "@/lib/utils/telephone";
import ErreurChargement from "@/components/ui/ErreurChargement";

export const metadata: Metadata = {
  title: "Leads qualifiés — Administration HOOMY.MA",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type Lead = {
  id: string;
  cree_le: string;
  nom: string;
  telephone: string;
  email: string | null;
  type_projet: string;
  budget: string | null;
  financement: string | null;
  delai: string | null;
  profil_client: string | null;
  zones: string[] | null;
  source: string;
  bien_id: string | null;
  contact_id: string | null;
  message: string | null;
  score: string;
  statut: string;
  agent_id: string | null;
  notes_interne: string | null;
  biens: { titre: string; slug: string | null; transaction: string } | null;
};

// ── Libellés ──────────────────────────────────────────────────────────────────

const SCORES: Record<string, { label: string; bg: string; color: string }> = {
  chaud: { label: "🔥 Chaud", bg: "#D4AF37", color: "#0F4C3A" },
  tiede: { label: "Tiède",    bg: "#FEF3C7", color: "#92400E" },
  froid: { label: "Froid",    bg: "#E5E7EB", color: "#4B5563" },
};

const TYPES: Record<string, string> = { achat: "Achat", location: "Location", vente: "Vente" };
const DELAIS: Record<string, string> = {
  moins_3_mois: "< 3 mois", entre_3_6_mois: "3–6 mois", plus_6_mois: "> 6 mois",
};
const FINANCEMENTS: Record<string, string> = {
  cash: "Cash", credit_accord: "Crédit accordé", credit_a_monter: "Crédit à monter", a_definir: "Financement à définir",
};
const SOURCES: Record<string, string> = {
  site: "Site", fiche_bien: "Fiche bien", accueil: "Accueil",
  estimation: "Estimation", meta_ads: "Meta Ads", whatsapp: "WhatsApp",
};

const ONGLETS = [
  { key: "",         label: "Tous" },
  { key: "nouveau",  label: "Nouveaux" },
  { key: "contacte", label: "Contactés" },
  { key: "qualifie", label: "Qualifiés" },
  { key: "transmis", label: "Transmis" },
  { key: "converti", label: "Convertis" },
  { key: "perdu",    label: "Perdus" },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function tempsRelatif(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  if (j < 30) return `il y a ${j} j`;
  return new Date(iso).toLocaleDateString("fr-MA", { day: "2-digit", month: "short" });
}

/** URL de la page en préservant les filtres actifs. */
function urlAvec(params: Record<string, string>, base: Record<string, string>): string {
  const merged = { ...base, ...params };
  const qs = Object.entries(merged)
    .filter(([, v]) => v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return `/admin/leads${qs ? `?${qs}` : ""}`;
}

// ── searchParams ──────────────────────────────────────────────────────────────

type SearchParams = Promise<{ statut?: string; score?: string; type?: string; source?: string; q?: string }>;

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PageAdminLeadsQualifies({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const fStatut = sp.statut ?? "";
  const fScore  = sp.score ?? "";
  const fType   = sp.type ?? "";
  const fSource = sp.source ?? "";
  const q       = (sp.q ?? "").trim();

  const filtresActifs = { statut: fStatut, score: fScore, type: fType, source: fSource, q };

  const supabase = await createClient();

  // ── Requête principale ──
  let query = supabase
    .from("leads")
    .select(
      "id, cree_le, nom, telephone, email, type_projet, budget, financement, delai, " +
      "profil_client, zones, source, bien_id, contact_id, message, score, statut, agent_id, notes_interne, " +
      "biens(titre, slug, transaction)"
    )
    .order("cree_le", { ascending: false })
    .limit(200);

  if (fStatut) query = query.eq("statut", fStatut);
  if (fScore)  query = query.eq("score", fScore);
  if (fType)   query = query.eq("type_projet", fType);
  if (fSource) query = query.eq("source", fSource);
  if (q)       query = query.or(`nom.ilike.%${q}%,telephone.ilike.%${q}%`);

  // ── Compteurs par statut + charge des conseillers + liste conseillers ──
  // L'erreur de la requête principale est LUE et affichée : un échec (embed,
  // colonne, policy) ne doit jamais se déguiser en « Aucun lead ».
  const [{ data: raw, error: erreurListe }, { data: tousRaw }, { data: agentsRaw }] = await Promise.all([
    query,
    supabase.from("leads").select("statut, agent_id"),
    supabase.from("profils").select("id, nom_complet, zones, role").in("role", ["agent", "agence"]).order("nom_complet"),
  ]);

  const leads = (raw ?? []) as unknown as Lead[];
  const tous = (tousRaw ?? []) as { statut: string; agent_id: string | null }[];

  const compteurs: Record<string, number> = {};
  for (const l of tous) compteurs[l.statut] = (compteurs[l.statut] ?? 0) + 1;

  // Charge par conseiller = leads affectés non clos
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
  const nomParAgent = Object.fromEntries(conseillers.map((c) => [c.id, c.nom_complet ?? "Conseiller"]));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">

      {/* ── En-tête ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-semibold mb-0.5" style={{ color: "#111" }}>Leads qualifiés</h1>
          <p className="text-sm" style={{ color: "#999" }}>
            {tous.length} lead{tous.length !== 1 ? "s" : ""} au total · score calculé automatiquement
          </p>
        </div>
        {/* File d'affectation — les leads 'nouveau' en attente d'un conseiller */}
        <Link
          href="/admin/leads/file"
          className="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl"
          style={{ background: "#0F4C3A", color: "#fff", textDecoration: "none" }}
        >
          File d&apos;affectation
          {(compteurs["nouveau"] ?? 0) > 0 && (
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "#D4AF37", color: "#0F4C3A" }}
            >
              {compteurs["nouveau"]}
            </span>
          )}
        </Link>
      </div>

      {/* ── Onglets statut avec compteurs ──────────────────────────────── */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
        {ONGLETS.map((o) => {
          const actif = fStatut === o.key;
          const n = o.key === "" ? tous.length : compteurs[o.key] ?? 0;
          return (
            <Link
              key={o.key}
              href={urlAvec({ statut: o.key }, filtresActifs)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl whitespace-nowrap flex-shrink-0"
              style={{
                background: actif ? "#0F4C3A" : "#fff",
                color: actif ? "#fff" : "#555",
                border: `1px solid ${actif ? "#0F4C3A" : "#E8E8E8"}`,
                textDecoration: "none",
              }}
            >
              {o.label}
              <span
                className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  background: actif ? "rgba(255,255,255,0.18)" : "#F5F5F5",
                  color: actif ? "#D4AF37" : "#999",
                }}
              >
                {n}
              </span>
            </Link>
          );
        })}
      </div>

      {/* ── Filtres score / type / source + recherche ───────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {/* Score */}
        {(["", "chaud", "tiede", "froid"] as const).map((s) => (
          <Link
            key={`score-${s}`}
            href={urlAvec({ score: s }, filtresActifs)}
            className="text-xs font-medium px-2.5 py-1.5 rounded-full"
            style={{
              background: fScore === s ? (s ? SCORES[s].bg : "#0F4C3A") : "#F5F5F5",
              color: fScore === s ? (s ? SCORES[s].color : "#fff") : "#777",
              textDecoration: "none",
            }}
          >
            {s === "" ? "Tout score" : SCORES[s].label}
          </Link>
        ))}

        <span style={{ color: "#E0E0E0" }}>|</span>

        {/* Type de projet */}
        {(["", "achat", "location", "vente"] as const).map((t) => (
          <Link
            key={`type-${t}`}
            href={urlAvec({ type: t }, filtresActifs)}
            className="text-xs font-medium px-2.5 py-1.5 rounded-full"
            style={{
              background: fType === t ? "#0F4C3A" : "#F5F5F5",
              color: fType === t ? "#fff" : "#777",
              textDecoration: "none",
            }}
          >
            {t === "" ? "Tout projet" : TYPES[t]}
          </Link>
        ))}

        <span style={{ color: "#E0E0E0" }}>|</span>

        {/* Source */}
        {(["", "fiche_bien", "accueil", "estimation", "meta_ads", "whatsapp"] as const).map((s) => (
          <Link
            key={`source-${s}`}
            href={urlAvec({ source: s }, filtresActifs)}
            className="text-xs font-medium px-2.5 py-1.5 rounded-full"
            style={{
              background: fSource === s ? "#0F4C3A" : "#F5F5F5",
              color: fSource === s ? "#fff" : "#777",
              textDecoration: "none",
            }}
          >
            {s === "" ? "Toute source" : SOURCES[s]}
          </Link>
        ))}

        {/* Recherche */}
        <form action="/admin/leads" method="GET" className="sm:ml-auto flex items-center gap-2">
          {fStatut && <input type="hidden" name="statut" value={fStatut} />}
          {fScore && <input type="hidden" name="score" value={fScore} />}
          {fType && <input type="hidden" name="type" value={fType} />}
          {fSource && <input type="hidden" name="source" value={fSource} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Nom ou téléphone…"
            className="text-sm px-3 py-2 rounded-xl border focus:outline-none w-44"
            style={{ borderColor: "#E8E8E8", color: "#111", background: "#fff" }}
          />
        </form>
      </div>

      {/* ── Erreur de chargement (jamais silencieuse) ───────────────────── */}
      {erreurListe && (
        <ErreurChargement
          titre="Impossible de charger la liste des leads"
          detail={erreurListe.message}
        />
      )}

      {/* ── État vide ───────────────────────────────────────────────────── */}
      {!erreurListe && leads.length === 0 && (
        <div className="rounded-2xl flex flex-col items-center py-16 text-center"
          style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: "#F5F5F5" }}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#BBB" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: "#333" }}>Aucun lead</p>
          <p className="text-xs" style={{ color: "#999" }}>
            {q || fStatut || fScore || fType || fSource
              ? "Aucun résultat avec ces filtres."
              : "Les leads soumis via le site apparaîtront ici."}
          </p>
        </div>
      )}

      {/* ── Liste des leads ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {leads.map((lead) => {
          const score = SCORES[lead.score] ?? { label: lead.score, bg: "#F5F5F5", color: "#777" };
          const tel = formatPhoneMaroc(lead.telephone);
          const chips = [
            TYPES[lead.type_projet] ?? lead.type_projet,
            lead.budget,
            lead.delai ? DELAIS[lead.delai] : null,
            lead.financement ? FINANCEMENTS[lead.financement] : null,
            lead.profil_client ? (lead.profil_client === "mre" ? "MRE" : "Résident") : null,
            lead.zones?.length ? lead.zones.join(", ") : null,
          ].filter((c): c is string => !!c);

          return (
            <article
              key={lead.id}
              className="rounded-2xl p-4"
              style={{
                background: "#fff",
                border: lead.score === "chaud" ? "1px solid rgba(212,175,55,0.55)" : "1px solid #EBEBEB",
              }}
            >
              {/* Ligne 1 : score + nom + contact + date relative */}
              <div className="flex items-start justify-between gap-3 flex-wrap mb-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: score.bg, color: score.color }}>
                    {score.label}
                  </span>
                  {/* Nom cliquable → fiche contact CRM (si rattachée) */}
                  {lead.contact_id ? (
                    <Link
                      href={`/admin/contacts/${lead.contact_id}`}
                      className="text-sm font-semibold hover:underline"
                      style={{ color: "#111", textDecoration: "none" }}
                    >
                      {lead.nom}
                    </Link>
                  ) : (
                    <p className="text-sm font-semibold" style={{ color: "#111" }}>{lead.nom}</p>
                  )}
                  {tel.affichage && (
                    <a href={`tel:${tel.lienTel}`} className="text-xs font-medium" style={{ color: "#0F4C3A" }}>
                      {tel.affichage}
                    </a>
                  )}
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} className="text-xs" style={{ color: "#999" }}>
                      {lead.email}
                    </a>
                  )}
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: "#BBB" }}>
                  {tempsRelatif(lead.cree_le)}
                </span>
              </div>

              {/* Ligne 2 : qualification en chips */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {chips.map((c, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-md"
                    style={{ background: "#F5F5F5", color: "#555" }}>
                    {c}
                  </span>
                ))}
                <span className="text-xs px-2 py-0.5 rounded-md"
                  style={{ background: "#F0FAF4", color: "#146C43" }}>
                  {SOURCES[lead.source] ?? lead.source}
                </span>
              </div>

              {/* Bien lié */}
              {lead.biens && (
                <p className="text-xs mb-2" style={{ color: "#999" }}>
                  Bien :{" "}
                  <Link
                    href={`/${lead.biens.transaction === "location" ? "louer" : "acheter"}/${lead.biens.slug ?? lead.bien_id}`}
                    className="font-medium hover:underline"
                    style={{ color: "#0F4C3A" }}
                    target="_blank"
                  >
                    {lead.biens.titre}
                  </Link>
                </p>
              )}

              {/* Message */}
              {lead.message && (
                <p className="text-xs italic mb-2 line-clamp-2" style={{ color: "#999" }}>
                  &ldquo;{lead.message}&rdquo;
                </p>
              )}

              {/* Actions */}
              <div className="pt-2.5" style={{ borderTop: "1px solid #F5F5F5" }}>
                <ActionsLeadQualifie
                  leadId={lead.id}
                  nom={lead.nom}
                  telephone={lead.telephone}
                  statut={lead.statut}
                  agentId={lead.agent_id}
                  agentNom={lead.agent_id ? nomParAgent[lead.agent_id] ?? "Conseiller" : null}
                  notesInterne={lead.notes_interne}
                  zonesLead={lead.zones ?? []}
                  conseillers={conseillers}
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
