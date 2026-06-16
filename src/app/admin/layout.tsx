import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SidebarAdmin from "@/components/admin/SidebarAdmin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administration — HOOMY.MA",
};

// Protège toutes les routes /admin — vérifie session + rôle admin
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion");
  }

  const { data: profil } = await supabase
    .from("profils")
    .select("nom_complet, role, avatar_url")
    .eq("id", user.id)
    .single();

  // Seuls les admins peuvent accéder — les autres sont renvoyés à l'accueil
  if (profil?.role !== "admin") {
    redirect("/?erreur=acces-refuse");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F4F6F5" }}>
      <SidebarAdmin
        nomAdmin={profil.nom_complet ?? user.email ?? "Admin"}
        avatarUrl={profil.avatar_url ?? null}
      />
      {/* Zone de contenu principale — décalée de la largeur de la sidebar sur desktop */}
      <main
        className="flex-1 overflow-auto"
        style={{ minHeight: "100vh" }}
      >
        {children}
      </main>
    </div>
  );
}
