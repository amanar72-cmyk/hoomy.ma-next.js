import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SidebarAdmin from "@/components/admin/SidebarAdmin";
import PwaInstaller from "@/components/pro/PwaInstaller";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administration — HOOMY PRO",
  manifest: "/manifest-pro.json",
  appleWebApp: {
    capable: true,
    title: "HOOMY PRO",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: [{ url: "/icons/pro-180", sizes: "180x180", type: "image/png" }],
  },
};

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

  if (profil?.role !== "admin") {
    redirect("/?erreur=acces-refuse");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F7F7F7" }}>
      <SidebarAdmin
        nomAdmin={profil.nom_complet ?? user.email ?? "Admin"}
        avatarUrl={profil.avatar_url ?? null}
      />
      <main className="flex-1 overflow-auto mt-[52px] lg:mt-0" style={{ minHeight: "100vh" }}>
        {children}
      </main>

      {/* Bandeau d'installation PWA */}
      <PwaInstaller />
    </div>
  );
}
