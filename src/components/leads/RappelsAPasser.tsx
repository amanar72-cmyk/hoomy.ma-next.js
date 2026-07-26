import { createAdminClient } from "@/lib/supabase/admin";
import { formatPhoneMaroc } from "@/lib/utils/telephone";
import RappelLead from "./RappelLead";

// Bloc « Rappels à passer » — affiché en tête des calendriers admin et agent.
// Volontairement séparé des visites : un appel n'est pas un rendez-vous sur
// place, et la grille des visites est groupée par jour autour d'un bien lié.
//
// Server Component : lecture en service_role (la RLS de `leads` n'ouvre rien
// aux agents), filtrée par agent_id quand un agent est passé. L'autorisation
// d'AGIR sur un rappel est revérifiée côté action (lib/leads/rappels.ts).

type LeadRappel = {
  id: string;
  nom: string;
  telephone: string;
  statut: string;
  date_rappel: string;
  rappel_note: string | null;
  rappel_fait_le: string | null;
};

type Props = {
  /** null/undefined = vue admin (tous les leads) ; sinon les leads de cet agent. */
  agentId?: string | null;
};

function formaterQuand(iso: string): string {
  return new Date(iso).toLocaleString("fr-MA", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
}

/** Hors du corps du composant : l'heure courante n'est pas une valeur de rendu pure. */
function estEnRetard(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

export default async function RappelsAPasser({ agentId }: Props) {
  const admin = createAdminClient();

  let requete = admin
    .from("leads")
    .select("id, nom, telephone, statut, date_rappel, rappel_note, rappel_fait_le")
    .not("date_rappel", "is", null)
    .is("rappel_fait_le", null)
    .order("date_rappel", { ascending: true })
    .limit(50);

  if (agentId) requete = requete.eq("agent_id", agentId);

  const { data } = await requete;
  const rappels = (data ?? []) as LeadRappel[];
  if (rappels.length === 0) return null;

  const enRetard = rappels.filter((r) => estEnRetard(r.date_rappel)).length;

  return (
    <section className="mb-6 rounded-2xl p-4 sm:p-5" style={{ background: "#fff", border: "1px solid #F3E0A8" }}>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "#0F4C3A" }}>
          Rappels à passer
        </h2>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#D4AF37", color: "#0F4C3A" }}>
          {rappels.length}
        </span>
        {enRetard > 0 && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#FEE2E2", color: "#991B1B" }}>
            {enRetard} en retard
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {rappels.map((r) => {
          const retard = estEnRetard(r.date_rappel);
          const tel = formatPhoneMaroc(r.telephone);
          return (
            <div
              key={r.id}
              className="rounded-xl p-3"
              style={{ background: retard ? "#FEF7F6" : "#FAFAF8", border: "1px solid #F0EDE5" }}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "#1f2a24" }}>{r.nom}</p>
                  {tel.affichage && (
                    <a href={tel.lienTel ?? undefined} className="text-xs" style={{ color: "#0F4C3A" }}>
                      {tel.affichage}
                    </a>
                  )}
                </div>
                <span className="text-xs whitespace-nowrap" style={{ color: retard ? "#991B1B" : "#6B7A71" }}>
                  {formaterQuand(r.date_rappel)}
                </span>
              </div>

              {r.rappel_note && (
                <p className="text-xs italic mb-2" style={{ color: "#6B7280" }}>« {r.rappel_note} »</p>
              )}

              <RappelLead
                leadId={r.id}
                dateRappel={r.date_rappel}
                rappelNote={r.rappel_note}
                rappelFaitLe={r.rappel_fait_le}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
