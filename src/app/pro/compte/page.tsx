import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import FormulaireComptePro from "@/components/pro/FormulaireComptePro";

export default async function PageProCompte() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profil } = await supabase
    .from("profils")
    .select("nom_complet, telephone, role, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-normal mb-1"
          style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
          Mon compte
        </h1>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>Gérez vos informations personnelles et votre sécurité.</p>
      </div>

      <FormulaireComptePro
        userId={user.id}
        nomComplet={profil?.nom_complet ?? ""}
        telephone={profil?.telephone ?? ""}
        email={user.email ?? ""}
        role={profil?.role ?? "agent"}
      />
    </div>
  );
}
