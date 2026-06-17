import { createClient } from "@/lib/supabase/server";
import BoutonAction from "@/components/admin/BoutonAction";
import { mettreDansFile, retirerBienAgent } from "@/app/admin/actions";

// Noms de colonnes réels dans Supabase
type BienFile = {
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
  date_soumission: string | null;
  agent_id: string | null;
};

type Profil = { id: string; nom_complet: string | null; telephone: string | null };

function formaterPrix(prix: number, transaction: string) {
  const m = prix.toLocaleString("fr-MA");
  return transaction === "location" ? `${m} DH/mois` : `${m} DH`;
}

function formaterDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "numeric" });
}

function CarteBien({ b, agentNom, slot }: {
  b: BienFile;
  agentNom?: string;
  slot: "attente" | "file" | "affecte";
}) {
  const photo = (b.photos as string[] | null)?.[0] ?? null;

  return (
    <div className="rounded-xl border flex gap-3 p-3"
      style={{ background: "#fff", borderColor: "#F0EDE5", boxShadow: "0 1px 8px rgba(15,76,58,0.05)" }}>
      {/* Miniature photo */}
      <div className="flex-shrink-0 rounded-lg overflow-hidden"
        style={{ width: 60, height: 60, background: "#F4F6F5" }}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#C4D8CE" strokeWidth="1.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-xs font-mono" style={{ color: "#9DB8AD" }}>{b.reference ?? "—"}</span>
          <span className="text-xs" style={{ color: "#9DB8AD" }}>·</span>
          <span className="text-xs" style={{ color: "#9DB8AD" }}>{b.type}</span>
        </div>
        <p className="text-sm font-medium truncate mb-1" style={{ color: "#1f2a24" }}>{b.titre}</p>
        <p className="text-xs mb-1" style={{ color: "#9DB8AD" }}>
          📍 {b.quartier ? `${b.quartier}, ` : ""}{b.ville}
        </p>
        <p className="text-sm font-semibold mb-1.5" style={{ color: "#0F4C3A" }}>
          {formaterPrix(b.prix, b.transaction)}
        </p>
        <p className="text-xs" style={{ color: "#C4D8CE" }}>
          Soumis {formaterDate(b.date_soumission)}
        </p>

        {/* Agent assigné */}
        {slot === "affecte" && agentNom && (
          <p className="text-xs mt-1 font-medium" style={{ color: "#146C43" }}>
            🧑‍💼 {agentNom}
          </p>
        )}

        {/* Boutons d'action */}
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {slot === "attente" && (
            <BoutonAction
              action={mettreDansFile.bind(null, b.id)}
              label="Mettre en file →"
              labelChargement="…"
              className="text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ background: "#0F4C3A", color: "#fff" }}
            />
          )}

          {slot === "affecte" && (
            <>
              <BoutonAction
                action={retirerBienAgent.bind(null, b.id, true)}
                label="Réaffecter"
                labelChargement="…"
                className="text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{ background: "#D4AF37", color: "#0F4C3A" }}
                confirmation="Retirer ce bien à l'agent et le remettre dans la file ?"
              />
              <BoutonAction
                action={retirerBienAgent.bind(null, b.id, false)}
                label="Retirer"
                labelChargement="…"
                className="text-xs px-3 py-1.5 rounded-lg border"
                style={{ borderColor: "#FECACA", color: "#991B1B" }}
                confirmation="Retirer ce bien à l'agent (sans remettre en file) ?"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ColonneFile({
  titre, couleur, biens, children, count,
}: {
  titre: string;
  couleur: { border: string; header: string; badge: string; textBadge: string };
  biens: BienFile[];
  count: number;
  children?: (b: BienFile) => React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border overflow-hidden min-h-[300px]"
      style={{ borderColor: couleur.border, flex: "1 1 0", minWidth: 280 }}>
      <div className="px-4 py-3 flex items-center justify-between border-b"
        style={{ background: couleur.header, borderColor: couleur.border }}>
        <h2 className="text-sm font-semibold" style={{ color: "#1f2a24" }}>{titre}</h2>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: couleur.badge, color: couleur.textBadge }}>
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-3 p-3 flex-1" style={{ background: "#FAFAF8" }}>
        {biens.length === 0 ? (
          <div className="flex items-center justify-center flex-1 py-10 text-sm"
            style={{ color: "#C4D8CE" }}>
            Aucun bien
          </div>
        ) : (
          biens.map((b) => (
            <div key={b.id}>
              {children?.(b)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default async function PageAdminAffectation() {
  const supabase = await createClient();

  const CHAMPS = "id, reference, titre, type, transaction, prix, ville, quartier, photos, statut, date_soumission, agent_id";

  const [{ data: enAttente }, { data: dansFile }, { data: affectes }] = await Promise.all([
    supabase.from("biens").select(CHAMPS).eq("statut", "en_attente_affectation").order("date_soumission", { ascending: true }),
    supabase.from("biens").select(CHAMPS).eq("statut", "dans_la_file").order("date_soumission", { ascending: true }),
    supabase.from("biens").select(CHAMPS).eq("statut", "affecte").order("date_soumission", { ascending: false }),
  ]);

  // Résolution des agents pour les biens affectés
  const agentIds = [...new Set((affectes ?? []).map((b) => b.agent_id).filter(Boolean))] as string[];
  let agentsMap: Record<string, Profil> = {};
  if (agentIds.length > 0) {
    const { data: agents } = await supabase
      .from("profils")
      .select("id, nom_complet, telephone")
      .in("id", agentIds);
    agentsMap = Object.fromEntries((agents ?? []).map((a) => [a.id, a]));
  }

  const att = (enAttente ?? []) as BienFile[];
  const file = (dansFile ?? []) as BienFile[];
  const aff = (affectes ?? []) as BienFile[];

  return (
    <div className="p-6 lg:p-10 max-w-screen-xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl mb-1"
          style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}>
          File d'affectation
        </h1>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>
          {att.length} en attente · {file.length} dans la file · {aff.length} affectés
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4" style={{ alignItems: "flex-start" }}>
        {/* Colonne 1 — En attente */}
        <ColonneFile
          titre="En attente"
          count={att.length}
          couleur={{ border: "#FDE68A", header: "#FFFBEB", badge: "#FCD34D", textBadge: "#78350F" }}
          biens={att}
        >
          {(b) => <CarteBien b={b} slot="attente" />}
        </ColonneFile>

        {/* Colonne 2 — Dans la file */}
        <ColonneFile
          titre="Dans la file"
          count={file.length}
          couleur={{ border: "#BFDBFE", header: "#EFF6FF", badge: "#93C5FD", textBadge: "#1E40AF" }}
          biens={file}
        >
          {(b) => <CarteBien b={b} slot="file" />}
        </ColonneFile>

        {/* Colonne 3 — Affectés */}
        <ColonneFile
          titre="Affectés"
          count={aff.length}
          couleur={{ border: "#6EE7B7", header: "#ECFDF5", badge: "#34D399", textBadge: "#064E3B" }}
          biens={aff}
        >
          {(b) => (
            <CarteBien
              b={b}
              slot="affecte"
              agentNom={agentsMap[b.agent_id ?? ""]?.nom_complet ?? undefined}
            />
          )}
        </ColonneFile>
      </div>
    </div>
  );
}
