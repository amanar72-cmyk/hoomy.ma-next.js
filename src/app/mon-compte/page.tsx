import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function PageMonCompte() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/connexion");

  const { data: profil } = await supabase
    .from("profils")
    .select("nom_complet, role, cree_le")
    .eq("id", user.id)
    .single();

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(160deg,#f0f7f4 0%,#FAF7F0 60%,#f5efe3 100%)" }}>
      <div className="w-full max-w-md">
        <div className="rounded-2xl p-8"
          style={{ background: "#fff", boxShadow: "0 4px 32px rgba(15,76,58,0.10)" }}>
          <h1 className="text-2xl font-normal mb-6"
            style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
            Mon compte
          </h1>

          <div className="flex flex-col gap-3 text-sm" style={{ color: "#3D4A42" }}>
            <div className="flex justify-between py-2 border-b" style={{ borderColor: "#F0EDE5" }}>
              <span style={{ color: "#9DB8AD" }}>Email</span>
              <span>{user.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b" style={{ borderColor: "#F0EDE5" }}>
              <span style={{ color: "#9DB8AD" }}>Nom</span>
              <span>{profil?.nom_complet ?? "—"}</span>
            </div>
            <div className="flex justify-between py-2 border-b" style={{ borderColor: "#F0EDE5" }}>
              <span style={{ color: "#9DB8AD" }}>Rôle</span>
              <span className="capitalize">{profil?.role ?? "acheteur"}</span>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <Link href="/"
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-center"
              style={{ background: "#F4F6F5", color: "#0F4C3A" }}>
              Accueil
            </Link>
            <Link href="/acheter"
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-center"
              style={{ background: "#0F4C3A", color: "#fff" }}>
              Voir les biens
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
