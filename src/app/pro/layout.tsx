import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SidebarPro from "@/components/pro/SidebarPro";
import HeaderPro from "@/components/pro/HeaderPro";
import PwaInstaller from "@/components/pro/PwaInstaller";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Espace Pro — HOOMY PRO",
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

const ROLES_AUTORISES = ["agent", "agence", "admin"];

export default async function ProLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profil } = await supabase
    .from("profils")
    .select("nom_complet, role, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profil || !ROLES_AUTORISES.includes(profil.role)) {
    redirect("/?message=acces-reserve-pro");
  }

  const nom = profil.nom_complet ?? user.email ?? "Professionnel";

  return (
    <div className="flex min-h-screen" style={{ background: "#F7F7F7" }}>
      <SidebarPro
        nomUtilisateur={nom}
        role={profil.role}
        avatarUrl={profil.avatar_url ?? null}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <HeaderPro
          nomUtilisateur={nom}
          role={profil.role}
        />
        <main className="flex-1 p-5 md:p-7 overflow-auto">
          {children}
        </main>
      </div>

      {/* Bandeau d'installation PWA — visible uniquement sur Android/Chrome */}
      <PwaInstaller />
    </div>
  );
}
