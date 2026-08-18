import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SidebarAdmin from "@/components/admin/SidebarAdmin";
import PwaInstaller from "@/components/pro/PwaInstaller";
import PontNatif from "@/components/mobile/PontNatif";
import { estAppNative } from "@/lib/mobile/natif-serveur";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Administration — Espace Pro",
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

// Même raison que dans pro/layout.tsx : sans viewport-fit=cover, les variables
// --pro-safe-* restent à zéro et le back-office passerait sous l'encoche.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#111111",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Lu depuis l'en-tête User-Agent : disponible dès la première requête,
  // avant toute hydratation.
  const dansAppNative = await estAppNative();

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

  // Badge « leads nouveaux » dans la navigation
  const { count: nbLeadsNouveaux } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("statut", "nouveau");

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F7F7F7" }}>
      <SidebarAdmin
        nomAdmin={profil.nom_complet ?? user.email ?? "Admin"}
        avatarUrl={profil.avatar_url ?? null}
        nbLeadsNouveaux={nbLeadsNouveaux ?? 0}
      />
      <main
        className="flex-1 overflow-auto mt-[calc(52px+var(--pro-safe-haut))] lg:mt-0"
        style={{ minHeight: "100vh", paddingBottom: "var(--pro-safe-bas)" }}
      >
        {children}
      </main>

      {/* Bandeau d'installation PWA */}
      {/* Bandeau d'installation PWA. Décidé côté serveur à partir du
          User-Agent : dans l'app native le composant n'est même pas rendu, ce
          qui évite à la fois un aller-retour d'hydratation et toute tentative
          d'inscription du Service Worker. */}
      {!dansAppNative && <PwaInstaller />}

      {/* Les comptes admin ouvrent le back-office dans la même app iOS que les
          agents : le pont natif doit être monté ici aussi. */}
      <PontNatif />
    </div>
  );
}
