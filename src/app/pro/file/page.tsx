import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import ListeBiensFileRealtime, { type BienFile } from "@/components/pro/ListeBiensFileRealtime";

export const metadata: Metadata = {
  title: "File d'affectation — Espace Pro HOOMY.MA",
};

export default async function PageFileAffectation() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  // Zones de l'agent
  const { data: profil } = await supabase
    .from("profils")
    .select("zones, role")
    .eq("id", user.id)
    .single();

  if (!profil || !["agent", "agence"].includes(profil.role ?? "")) {
    redirect("/pro");
  }

  const zones: string[] = Array.isArray(profil.zones) ? profil.zones : [];

  // Biens dans la file pour les villes de l'agent
  let biensRaw: BienFile[] = [];
  if (zones.length > 0) {
    const { data } = await supabase
      .from("biens")
      .select("id, reference, titre, type, transaction, prix, ville, quartier, photos, surface, chambres, cree_le")
      .eq("dans_file", true)
      .in("ville", zones)
      .order("cree_le", { ascending: true });

    biensRaw = (data ?? []) as unknown as BienFile[];
  }

  return (
    <div className="max-w-3xl mx-auto">

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1
          className="text-2xl font-normal mb-1"
          style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}
        >
          File d'affectation
        </h1>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>
          {biensRaw.length} bien{biensRaw.length !== 1 ? "s" : ""} disponible{biensRaw.length !== 1 ? "s" : ""}{" "}
          {zones.length > 0 ? `· ${zones.join(", ")}` : ""}
        </p>
      </div>

      {/* ── Info zone absente ────────────────────────────────────────────── */}
      {zones.length === 0 && (
        <div
          className="rounded-2xl p-6 mb-6"
          style={{ background: "#FEF9C3", border: "1px solid #FDE68A" }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: "#713F12" }}>
            Aucune zone d'intervention définie
          </p>
          <p className="text-sm" style={{ color: "#92400E" }}>
            Contactez votre administrateur pour configurer vos zones d'affectation.
          </p>
        </div>
      )}

      {/* ── Liste temps réel ─────────────────────────────────────────────── */}
      <ListeBiensFileRealtime biensInitiaux={biensRaw} />

    </div>
  );
}
