import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import SidebarClient from "@/components/compte/SidebarClient";

export const metadata: Metadata = {
  title: "Mon espace — HOOMY.MA",
};

export default async function MonCompteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/connexion?redirect=/mon-compte");

  const { data: profil } = await supabase
    .from("profils")
    .select("nom_complet, role, avatar_url")
    .eq("id", user.id)
    .single();

  const role = profil?.role ?? "acheteur";

  // Rediriger les admins et agents vers leur espace dédié
  if (role === "admin") redirect("/admin");
  if (role === "agent" || role === "agence") redirect("/pro");

  return (
    <div className="flex min-h-screen" style={{ background: "#F7F5F0" }}>
      <SidebarClient
        nomComplet={profil?.nom_complet ?? null}
        email={user.email ?? null}
        avatarUrl={profil?.avatar_url ?? null}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex-1 p-4 pt-16 md:pt-4 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
