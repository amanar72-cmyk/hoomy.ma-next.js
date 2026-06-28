import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import FormulaireProfil from "./FormulaireProfil";

export const metadata: Metadata = {
  title: "Paramètres — Mon espace HOOMY.MA",
};

export default async function PageParametres() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/mon-compte/parametres");

  const { data: profil } = await supabase
    .from("profils")
    .select("nom_complet, telephone, cree_le")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-xl mx-auto">

      {/* En-tête */}
      <div className="mb-8">
        <h1
          className="text-xl font-normal mb-0.5"
          style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}
        >
          Mon compte
        </h1>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>
          Gérez vos informations personnelles.
        </p>
      </div>

      {/* Carte principale */}
      <section
        className="rounded-2xl p-6 mb-4"
        style={{ background: "#fff", border: "1px solid #F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.06)" }}
      >
        <h2 className="text-sm font-semibold mb-5" style={{ color: "#0F4C3A" }}>
          Informations personnelles
        </h2>
        <FormulaireProfil
          nomComplet={profil?.nom_complet ?? null}
          email={user.email ?? null}
          telephone={profil?.telephone ?? null}
        />
      </section>

      {/* Carte infos compte */}
      <section
        className="rounded-2xl p-5"
        style={{ background: "#F9F7F4", border: "1px solid #F0EDE5" }}
      >
        <p className="text-xs font-medium mb-3" style={{ color: "#9DB8AD", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Informations du compte
        </p>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span style={{ color: "#6B7280" }}>Identifiant</span>
            <span className="font-mono text-xs" style={{ color: "#9DB8AD" }}>{user.id.slice(0, 8)}…</span>
          </div>
          {profil?.cree_le && (
            <div className="flex justify-between">
              <span style={{ color: "#6B7280" }}>Membre depuis</span>
              <span style={{ color: "#374151" }}>
                {new Date(profil.cree_le).toLocaleDateString("fr-MA", { month: "long", year: "numeric" })}
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
