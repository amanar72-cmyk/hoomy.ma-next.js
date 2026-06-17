import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import CalendrierVisites, { type VisiteConfirmee } from "@/components/pro/CalendrierVisites";

export const metadata: Metadata = {
  title: "Mon calendrier — Espace Pro HOOMY.MA",
};

export default async function PageProCalendrier() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  // Visites confirmées de l'agent
  const { data: raw } = await supabase
    .from("demandes_visite")
    .select(
      "id, date_confirmee, nom_client, email_client, telephone_client, " +
      "biens(titre, reference, ville)"
    )
    .eq("agent_id", user.id)
    .eq("statut", "confirmee")
    .not("date_confirmee", "is", null)
    .order("date_confirmee", { ascending: true });

  type RawVisite = {
    id: string;
    date_confirmee: string;
    nom_client: string;
    email_client: string;
    telephone_client: string | null;
    biens: { titre: string; reference: string | null; ville: string } | null;
  };

  const rawVisites = (raw ?? []) as unknown as RawVisite[];

  const visites: VisiteConfirmee[] = rawVisites.map((v) => ({
    id: v.id,
    date_confirmee: v.date_confirmee,
    nom_client: v.nom_client,
    email_client: v.email_client,
    telephone_client: v.telephone_client,
    bien_titre: v.biens?.titre ?? "Bien sans titre",
    bien_reference: v.biens?.reference ?? null,
    bien_ville: v.biens?.ville ?? "",
  }));

  const maintenant = new Date().toLocaleDateString("fr-MA", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="max-w-6xl mx-auto">

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1
          className="text-2xl font-normal mb-1"
          style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}
        >
          Mon calendrier
        </h1>
        <p className="text-sm capitalize" style={{ color: "#9DB8AD" }}>
          {maintenant} · {visites.length} visite{visites.length !== 1 ? "s" : ""} confirmée{visites.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Calendrier ───────────────────────────────────────────────────── */}
      <CalendrierVisites visites={visites} />

    </div>
  );
}
