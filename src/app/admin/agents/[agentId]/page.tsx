import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import BoutonAction from "@/components/admin/BoutonAction";
import { retirerBienAgent } from "@/app/admin/actions";

type Props = { params: Promise<{ agentId: string }> };

function formaterPrix(prix: number, transaction: string) {
  const m = prix.toLocaleString("fr-MA");
  return transaction === "location" ? `${m} DH/mois` : `${m} DH`;
}

export default async function PageBiensAgent({ params }: Props) {
  const { agentId } = await params;
  const supabase = await createClient();

  const [{ data: agent }, { data: biens }] = await Promise.all([
    supabase.from("profils").select("id, nom_complet, telephone, role").eq("id", agentId).single(),
    supabase
      .from("biens")
      .select("id, reference, titre, type, transaction, prix, ville, quartier, photos, statut, date_soumission, date_affectation")
      .eq("agent_id", agentId)
      .order("date_affectation", { ascending: false }),
  ]);

  if (!agent) notFound();

  const liste = biens ?? [];

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/agents"
          className="text-xs flex items-center gap-1 mb-4"
          style={{ color: "#9DB8AD" }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Retour aux agents
        </Link>
        <h1 className="text-2xl mb-1"
          style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}>
          Biens de {agent.nom_complet ?? "—"}
        </h1>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>
          {agent.role} · {agent.telephone ?? "pas de téléphone"} · {liste.length} bien{liste.length !== 1 ? "s" : ""}
        </p>
      </div>

      {liste.length === 0 ? (
        <div className="text-center py-20" style={{ color: "#9DB8AD" }}>
          Aucun bien affecté à cet agent.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {liste.map((b) => {
            const photo = (b.photos as string[] | null)?.[0] ?? null;
            return (
              <div key={b.id} className="rounded-2xl border p-4 flex gap-4 items-center flex-wrap"
                style={{ background: "#fff", borderColor: "#F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.04)" }}>

                {/* Photo */}
                <div className="flex-shrink-0 rounded-xl overflow-hidden"
                  style={{ width: 72, height: 56, background: "#F4F6F5" }}>
                  {photo
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={photo} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center">
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#C4D8CE" strokeWidth="1.5">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        </svg>
                      </div>
                  }
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-[180px]">
                  <p className="text-xs mb-0.5 font-mono" style={{ color: "#9DB8AD" }}>{b.reference ?? "—"}</p>
                  <p className="text-sm font-medium" style={{ color: "#1f2a24" }}>{b.titre}</p>
                  <p className="text-xs" style={{ color: "#9DB8AD" }}>
                    {b.quartier ? `${b.quartier}, ` : ""}{b.ville} · {b.type}
                  </p>
                </div>

                <p className="font-semibold text-sm flex-shrink-0" style={{ color: "#0F4C3A" }}>
                  {formaterPrix(b.prix, b.transaction)}
                </p>

                <span className="text-xs px-2.5 py-1 rounded-full flex-shrink-0"
                  style={{ background: "#D1FAE5", color: "#065F46" }}>
                  {b.statut ?? "—"}
                </span>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <BoutonAction
                    action={retirerBienAgent.bind(null, b.id, true)}
                    label="Réaffecter"
                    className="text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{ background: "#D4AF37", color: "#0F4C3A" }}
                    confirmation="Retirer ce bien à l'agent et remettre dans la file ?"
                  />
                  <BoutonAction
                    action={retirerBienAgent.bind(null, b.id, false)}
                    label="Retirer"
                    className="text-xs px-3 py-1.5 rounded-lg border"
                    style={{ borderColor: "#FECACA", color: "#991B1B" }}
                    confirmation="Retirer ce bien à l'agent ?"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
