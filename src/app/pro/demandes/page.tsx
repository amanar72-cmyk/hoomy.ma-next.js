import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import ActionsDemandeVisite from "@/components/pro/ActionsDemandeVisite";

export const metadata: Metadata = {
  title: "Mes demandes — Espace Pro HOOMY.MA",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type Demande = {
  id: string;
  nom_client: string;
  email_client: string;
  telephone_client: string | null;
  date_souhaitee: string | null;
  date_confirmee: string | null;
  message: string | null;
  statut: string;
  cree_le: string;
  biens: {
    titre: string;
    reference: string | null;
    photos: string[] | null;
    transaction: string;
    ville: string;
  } | null;
};

// ── Onglets ───────────────────────────────────────────────────────────────────

const ONGLETS = [
  { key: "nouvelle",  label: "Nouvelles",  badge: { bg: "#DBEAFE", color: "#1E40AF" } },
  { key: "confirmee", label: "Confirmées", badge: { bg: "#D1FAE5", color: "#065F46" } },
  { key: "realisee",  label: "Réalisées",  badge: { bg: "#F3F4F6", color: "#374151" } },
  { key: "annulee",   label: "Annulées",   badge: { bg: "#FEE2E2", color: "#991B1B" } },
];

type SearchParams = Promise<{ statut?: string }>;

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PageProDemandes({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const statutActif = sp.statut ?? "nouvelle";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: demandesRaw } = await supabase
    .from("demandes_visite")
    .select(
      "id, nom_client, email_client, telephone_client, " +
      "date_souhaitee, date_confirmee, message, statut, cree_le, " +
      "biens(titre, reference, photos, transaction, ville)"
    )
    .eq("agent_id", user.id)
    .order("cree_le", { ascending: false });

  const toutes = (demandesRaw ?? []) as unknown as Demande[];

  function compter(statut: string) {
    return toutes.filter((d) => d.statut === statut).length;
  }

  const demandesAffichees = toutes.filter((d) => d.statut === statutActif);

  function formaterDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("fr-MA", {
      day: "2-digit", month: "long", year: "numeric",
    });
  }

  return (
    <div className="max-w-4xl mx-auto">

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1
          className="text-2xl font-normal mb-1"
          style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}
        >
          Mes demandes
        </h1>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>
          {toutes.length} demande{toutes.length !== 1 ? "s" : ""} au total
        </p>
      </div>

      {/* ── Onglets ──────────────────────────────────────────────────────── */}
      <div
        className="flex gap-1 p-1 rounded-2xl mb-6 overflow-x-auto"
        style={{ background: "#F0EDE5" }}
      >
        {ONGLETS.map((o) => {
          const actif = statutActif === o.key;
          const compte = compter(o.key);
          return (
            <Link
              key={o.key}
              href={`/pro/demandes?statut=${o.key}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-sm whitespace-nowrap transition-all"
              style={{
                background: actif ? "#fff" : "transparent",
                color: actif ? "#0F4C3A" : "#9DB8AD",
                boxShadow: actif ? "0 1px 6px rgba(15,76,58,0.10)" : "none",
                textDecoration: "none",
                fontWeight: actif ? 600 : 400,
              }}
            >
              {o.label}
              <span
                className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  background: actif ? o.badge.bg : "#E8E2D2",
                  color: actif ? o.badge.color : "#9DB8AD",
                }}
              >
                {compte}
              </span>
            </Link>
          );
        })}
      </div>

      {/* ── État vide ────────────────────────────────────────────────────── */}
      {demandesAffichees.length === 0 && (
        <div
          className="rounded-2xl flex flex-col items-center py-16 text-center"
          style={{ background: "#fff", border: "1px solid #F0EDE5" }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "#F0FAF4" }}
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#0F4C3A" strokeWidth="1.5">
              <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
              <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
            </svg>
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: "#0F4C3A" }}>
            Aucune demande {ONGLETS.find((o) => o.key === statutActif)?.label.toLowerCase()}
          </p>
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            Les demandes de visite apparaîtront ici.
          </p>
        </div>
      )}

      {/* ── Liste ────────────────────────────────────────────────────────── */}
      {demandesAffichees.length > 0 && (
        <div className="flex flex-col gap-4">
          {demandesAffichees.map((d) => {
            const photo = (d.biens?.photos as string[] | null)?.[0] ?? null;
            return (
              <article
                key={d.id}
                className="rounded-2xl overflow-hidden"
                style={{ background: "#fff", border: "1px solid #F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.06)" }}
              >
                <div className="flex gap-4 p-4">
                  {/* Photo du bien */}
                  <div
                    className="flex-shrink-0 rounded-xl overflow-hidden"
                    style={{ width: 80, height: 64, background: "#F4F6F5" }}
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#C4D8CE" strokeWidth="1.2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-semibold line-clamp-1" style={{ color: "#1f2a24" }}>
                        {d.biens?.titre ?? "Bien non trouvé"}
                      </p>
                      {d.biens?.reference && (
                        <span
                          className="text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{ background: "#F0EDE5", color: "#9DB8AD" }}
                        >
                          {d.biens.reference}
                        </span>
                      )}
                    </div>

                    <p className="text-xs mb-2" style={{ color: "#9DB8AD" }}>
                      {d.biens?.ville}
                      {d.biens?.transaction ? ` · ${d.biens.transaction === "vente" ? "Vente" : "Location"}` : ""}
                    </p>

                    {/* Client */}
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mb-1.5">
                      <span className="text-xs font-semibold" style={{ color: "#0F4C3A" }}>
                        {d.nom_client}
                      </span>
                      <a href={`mailto:${d.email_client}`} className="text-xs" style={{ color: "#9DB8AD" }}>
                        {d.email_client}
                      </a>
                      {d.telephone_client && (
                        <a href={`tel:${d.telephone_client}`} className="text-xs" style={{ color: "#9DB8AD" }}>
                          {d.telephone_client}
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 text-xs" style={{ color: "#9DB8AD" }}>
                      <span>Souhaitée : {formaterDate(d.date_souhaitee)}</span>
                      {d.date_confirmee && (
                        <span className="font-medium" style={{ color: "#065F46" }}>
                          Confirmée le {formaterDate(d.date_confirmee)}
                        </span>
                      )}
                    </div>

                    {d.message && (
                      <p className="text-xs mt-1.5 italic line-clamp-2" style={{ color: "#6B7A71" }}>
                        &ldquo;{d.message}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {(d.statut === "nouvelle" || d.statut === "confirmee") && (
                  <div
                    className="px-4 pb-3 pt-3"
                    style={{ borderTop: "1px solid #F8F5EE" }}
                  >
                    <ActionsDemandeVisite demandeId={d.id} statut={d.statut} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
