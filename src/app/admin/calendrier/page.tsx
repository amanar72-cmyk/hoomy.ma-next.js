import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import ActionsLead from "@/components/pro/ActionsLead";
import { changerStatutLeadAdmin } from "@/app/admin/actions";

export const metadata: Metadata = {
  title: "Calendrier global — Administration HOOMY.MA",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type Visite = {
  id: string;
  nom_client: string;
  email_client: string;
  telephone_client: string | null;
  date_souhaitee: string;
  message: string | null;
  statut: string;
  cree_le: string;
  agent_id: string | null;
  biens: {
    id: string;
    titre: string;
    reference: string | null;
    ville: string;
    quartier: string | null;
    photos: string[] | null;
  } | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const BADGE_STATUT: Record<string, { label: string; bg: string; color: string }> = {
  nouvelle:  { label: "À planifier", bg: "#DBEAFE", color: "#1E40AF" },
  confirmee: { label: "Confirmée",   bg: "#FEF3C7", color: "#92400E" },
  realisee:  { label: "Réalisée",    bg: "#D1FAE5", color: "#065F46" },
  annulee:   { label: "Annulée",     bg: "#FEE2E2", color: "#991B1B" },
};

function dateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

function formaterDateTuile(s: string) {
  const d = new Date(s + "T12:00:00Z");
  return {
    num:  d.getDate().toString(),
    mois: d.toLocaleDateString("fr-MA", { month: "short" }),
    jour: d.toLocaleDateString("fr-MA", { weekday: "short" }),
  };
}

// ── searchParams ──────────────────────────────────────────────────────────────

type SearchParams = Promise<{ vue?: string; statut?: string }>;

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PageAdminCalendrier({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const vuePast      = sp.vue === "passees";
  const filtreStatut = sp.statut ?? "";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profil } = await supabase.from("profils").select("role").eq("id", user.id).single();
  if (!profil || profil.role !== "admin") redirect("/");

  const aujourd_hui = dateStr(0);
  const demain      = dateStr(1);
  const dans6jours  = dateStr(6);

  // Toutes les visites (admin = pas de filtre agent)
  let query = supabase
    .from("demandes_visite")
    .select(
      "id, nom_client, email_client, telephone_client, date_souhaitee, message, statut, cree_le, agent_id, " +
      "biens(id, titre, reference, ville, quartier, photos)"
    )
    .not("date_souhaitee", "is", null);

  if (vuePast) {
    query = query.lt("date_souhaitee", aujourd_hui).order("date_souhaitee", { ascending: false });
  } else {
    query = query.gte("date_souhaitee", aujourd_hui).order("date_souhaitee", { ascending: true });
  }

  if (filtreStatut) query = query.eq("statut", filtreStatut);

  const { data: raw } = await query;
  const visites = (raw ?? []) as unknown as Visite[];

  // Résoudre les noms d'agents
  const agentIds = [...new Set(visites.map((v) => v.agent_id).filter((id): id is string => !!id))];
  let agentMap: Record<string, string> = {};
  if (agentIds.length > 0) {
    const { data: agents } = await supabase
      .from("profils")
      .select("id, nom_complet")
      .in("id", agentIds);
    agentMap = Object.fromEntries((agents ?? []).map((a) => [a.id, a.nom_complet ?? "—"]));
  }

  // Total à venir (pour le sous-titre)
  const { data: comptesRaw } = await supabase
    .from("demandes_visite")
    .select("id", { count: "exact" })
    .not("date_souhaitee", "is", null)
    .gte("date_souhaitee", aujourd_hui);
  const totalAVenir = comptesRaw?.length ?? 0;

  // Groupement (vue à venir uniquement)
  type Groupe = { cle: string; label: string; accent: boolean; visites: Visite[] };
  let groupes: Groupe[] = [];

  if (!vuePast) {
    const g: Record<string, Visite[]> = { auj: [], dem: [], sem: [], suite: [] };
    for (const v of visites) {
      if      (v.date_souhaitee === aujourd_hui) g.auj.push(v);
      else if (v.date_souhaitee === demain)      g.dem.push(v);
      else if (v.date_souhaitee <= dans6jours)   g.sem.push(v);
      else                                        g.suite.push(v);
    }
    groupes = [
      { cle: "auj",   label: "Aujourd'hui",  accent: true,  visites: g.auj   },
      { cle: "dem",   label: "Demain",        accent: false, visites: g.dem   },
      { cle: "sem",   label: "Cette semaine", accent: false, visites: g.sem   },
      { cle: "suite", label: "Plus tard",     accent: false, visites: g.suite },
    ].filter((gr) => gr.visites.length > 0);
  }

  // Onglets statut
  const ONGLETS = [
    { key: "",          label: "Tous"           },
    { key: "nouvelle",  label: "À planifier"    },
    { key: "confirmee", label: "Confirmées"     },
    { key: "realisee",  label: "Réalisées"      },
    { key: "annulee",   label: "Annulées"       },
  ] as const;

  const { data: tousRaw } = await supabase
    .from("demandes_visite")
    .select("statut")
    .not("date_souhaitee", "is", null);
  const tousStatuts = tousRaw ?? [];
  function compterStatut(s: string) {
    return s === "" ? tousStatuts.length : tousStatuts.filter((v) => v.statut === s).length;
  }

  const baseHref = `/admin/calendrier${vuePast ? "?vue=passees" : ""}`;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">

      {/* En-tête */}
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold mb-0.5" style={{ color: "#111" }}>
            Calendrier global
          </h1>
          <p className="text-sm" style={{ color: "#999" }}>
            {totalAVenir} visite{totalAVenir !== 1 ? "s" : ""} à venir — {agentIds.length} agent{agentIds.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Toggle À venir / Passées */}
      <div className="flex gap-1 p-1 rounded-2xl mb-5 w-fit" style={{ background: "#F0F0F0" }}>
        {[
          { label: "À venir", href: "/admin/calendrier",              actif: !vuePast },
          { label: "Passées", href: "/admin/calendrier?vue=passees",  actif: vuePast  },
        ].map((btn) => (
          <Link
            key={btn.href}
            href={btn.href}
            className="py-2 px-5 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
            style={{
              background:     btn.actif ? "#fff" : "transparent",
              color:          btn.actif ? "#111" : "#888",
              boxShadow:      btn.actif ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              textDecoration: "none",
            }}
          >
            {btn.label}
          </Link>
        ))}
      </div>

      {/* Onglets statut */}
      <div className="flex gap-1 p-1 rounded-2xl mb-5 overflow-x-auto" style={{ background: "#F0F0F0" }}>
        {ONGLETS.map((o) => {
          const actif = filtreStatut === o.key;
          const nb = compterStatut(o.key);
          const href = `${baseHref}${baseHref.includes("?") ? "&" : "?"}${o.key ? `statut=${o.key}` : ""}`.replace(/[?&]$/, "");
          return (
            <Link
              key={o.key}
              href={href}
              className="flex-shrink-0 flex items-center gap-1.5 py-2 px-4 rounded-xl text-sm whitespace-nowrap transition-all"
              style={{
                background:     actif ? "#fff" : "transparent",
                color:          actif ? "#111" : "#888",
                boxShadow:      actif ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                textDecoration: "none",
                fontWeight:     actif ? 600 : 400,
              }}
            >
              {o.label}
              {nb > 0 && (
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: actif ? "#111" : "#E0E0E0", color: actif ? "#fff" : "#888" }}>
                  {nb}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* État vide */}
      {visites.length === 0 && (
        <div
          className="rounded-2xl flex flex-col items-center py-16 text-center"
          style={{ background: "#fff", border: "1px solid #EBEBEB" }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "#F5F5F5" }}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#BBB" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: "#333" }}>
            Aucune visite {vuePast ? "passée" : "planifiée"}
          </p>
          <p className="text-xs" style={{ color: "#999" }}>
            {vuePast
              ? "Les visites passées apparaîtront ici."
              : "Les demandes de visite des clients apparaîtront ici."}
          </p>
        </div>
      )}

      {/* Vue PASSÉES */}
      {vuePast && visites.length > 0 && (
        <div className="flex flex-col gap-3">
          {visites.map((v) => {
            const tuile   = formaterDateTuile(v.date_souhaitee);
            const badge   = BADGE_STATUT[v.statut] ?? { label: v.statut, bg: "#F5F5F5", color: "#777" };
            const photo   = (v.biens?.photos as string[] | null)?.[0] ?? null;
            const agentNom = v.agent_id ? (agentMap[v.agent_id] ?? null) : null;
            return (
              <CarteVisiteAdmin
                key={v.id}
                visite={v} tuile={tuile} badge={badge} photo={photo} agentNom={agentNom}
                marquerEnCours={changerStatutLeadAdmin.bind(null, v.id, "confirmee")}
                marquerTraite={changerStatutLeadAdmin.bind(null, v.id, "realisee")}
                marquerNouvel={changerStatutLeadAdmin.bind(null, v.id, "nouvelle")}
              />
            );
          })}
        </div>
      )}

      {/* Vue À VENIR — groupée */}
      {!vuePast && groupes.map((groupe) => (
        <div key={groupe.cle} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span
              className="text-xs font-semibold uppercase tracking-wider flex-shrink-0"
              style={{ color: groupe.accent ? "#D4AF37" : "#999" }}
            >
              {groupe.label}
            </span>
            <div className="flex-1 h-px" style={{ background: "#EBEBEB" }} />
            <span className="text-xs flex-shrink-0" style={{ color: "#CCC" }}>
              {groupe.visites.length} visite{groupe.visites.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {groupe.visites.map((v) => {
              const tuile    = formaterDateTuile(v.date_souhaitee);
              const badge    = BADGE_STATUT[v.statut] ?? { label: v.statut, bg: "#F5F5F5", color: "#777" };
              const photo    = (v.biens?.photos as string[] | null)?.[0] ?? null;
              const agentNom = v.agent_id ? (agentMap[v.agent_id] ?? null) : null;
              return (
                <CarteVisiteAdmin
                  key={v.id}
                  visite={v} tuile={tuile} badge={badge} photo={photo} agentNom={agentNom}
                  marquerEnCours={changerStatutLeadAdmin.bind(null, v.id, "confirmee")}
                  marquerTraite={changerStatutLeadAdmin.bind(null, v.id, "realisee")}
                  marquerNouvel={changerStatutLeadAdmin.bind(null, v.id, "nouvelle")}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Composant carte visite (admin) ────────────────────────────────────────────

type TuileDateProps = { num: string; mois: string; jour: string };

function CarteVisiteAdmin({
  visite,
  tuile,
  badge,
  photo,
  agentNom,
  marquerEnCours,
  marquerTraite,
  marquerNouvel,
}: {
  visite:    Visite;
  tuile:     TuileDateProps;
  badge:     { label: string; bg: string; color: string };
  photo:     string | null;
  agentNom:  string | null;
  marquerEnCours: () => Promise<void>;
  marquerTraite:  () => Promise<void>;
  marquerNouvel:  () => Promise<void>;
}) {
  return (
    <article
      className="rounded-2xl overflow-hidden"
      style={{ background: "#fff", border: "1px solid #EBEBEB" }}
    >
      <div className="flex gap-4 p-4">

        {/* Tuile date */}
        <div
          className="flex-shrink-0 rounded-2xl flex flex-col items-center justify-center"
          style={{ width: 52, minHeight: 60, background: "#F5F5F5", border: "1px solid #EBEBEB" }}
        >
          <span className="text-[10px] font-medium capitalize" style={{ color: "#BBB" }}>
            {tuile.jour}
          </span>
          <span className="text-xl font-bold leading-tight" style={{ color: "#111" }}>
            {tuile.num}
          </span>
          <span className="text-[10px] font-medium capitalize" style={{ color: "#999" }}>
            {tuile.mois}
          </span>
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">

          {/* Bien */}
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt=""
                className="rounded-lg object-cover flex-shrink-0"
                style={{ width: 36, height: 28 }} />
            ) : (
              <div className="rounded-lg flex-shrink-0 flex items-center justify-center"
                style={{ width: 36, height: 28, background: "#F5F5F5" }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#CCC" strokeWidth="1.2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
              </div>
            )}
            {visite.biens?.reference && (
              <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                style={{ background: "#F5F5F5", color: "#BBB" }}>
                {visite.biens.reference}
              </span>
            )}
            <Link
              href={`/admin/biens/${visite.biens?.id ?? "#"}`}
              className="text-xs font-semibold truncate hover:underline"
              style={{ color: "#111", textDecoration: "none", maxWidth: 240 }}
            >
              {visite.biens?.titre ?? "Bien non trouvé"}
            </Link>
            {visite.biens?.ville && (
              <span className="text-xs" style={{ color: "#999" }}>
                · {visite.biens.ville}{visite.biens.quartier ? ` · ${visite.biens.quartier}` : ""}
              </span>
            )}
          </div>

          {/* Client */}
          <p className="text-sm font-semibold mb-0.5" style={{ color: "#111" }}>
            {visite.nom_client}
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs mb-1.5" style={{ color: "#888" }}>
            <a href={`mailto:${visite.email_client}`} style={{ color: "#888" }}>
              {visite.email_client}
            </a>
            {visite.telephone_client && (
              <a href={`tel:${visite.telephone_client}`} className="font-medium" style={{ color: "#555" }}>
                {visite.telephone_client}
              </a>
            )}
          </div>

          {/* Statut + agent + message */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: badge.bg, color: badge.color }}>
              {badge.label}
            </span>
            {/* Agent */}
            <div className="flex items-center gap-1">
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#BBB" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="text-xs" style={{ color: agentNom ? "#777" : "#CCC" }}>
                {agentNom ?? "Sans agent"}
              </span>
            </div>
            {visite.message && (
              <p className="text-xs italic line-clamp-1" style={{ color: "#AAA" }}>
                &ldquo;{visite.message}&rdquo;
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-3 pt-2" style={{ borderTop: "1px solid #F5F5F5" }}>
        <ActionsLead
          telephone={visite.telephone_client}
          statut={visite.statut}
          marquerEnCours={marquerEnCours}
          marquerTraite={marquerTraite}
          marquerNouvel={marquerNouvel}
        />
      </div>
    </article>
  );
}
