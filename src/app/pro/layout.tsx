import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SidebarPro from "@/components/pro/SidebarPro";
import HeaderPro from "@/components/pro/HeaderPro";
import PwaInstaller from "@/components/pro/PwaInstaller";
import PontNatif from "@/components/mobile/PontNatif";
import { estAppNative } from "@/lib/mobile/natif-serveur";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Espace Pro — Espace Pro",
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

// `viewportFit: "cover"` autorise la page à s'étendre sous l'encoche et la barre
// d'accueil — c'est LA condition pour que env(safe-area-inset-*) cesse de valoir
// zéro, et donc pour que les marges posées dans SidebarPro servent à quelque
// chose. Volontairement déclaré sur ce gabarit plutôt qu'à la racine : le site
// public grand public n'a aucune raison de changer de mise en page.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#111111",
};

const ROLES_AUTORISES = ["agent", "agence", "admin"];

export default async function ProLayout({ children }: { children: React.ReactNode }) {
  // Lu depuis l'en-tête User-Agent : disponible dès la première requête,
  // avant toute hydratation.
  const dansAppNative = await estAppNative();

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

      <div className="flex flex-col flex-1 min-w-0 mt-[calc(52px+var(--pro-safe-haut))] lg:mt-0">
        <HeaderPro
          nomUtilisateur={nom}
          role={profil.role}
        />
        <main
          className="flex-1 p-5 md:p-7 overflow-auto"
          style={{ paddingBottom: "calc(1.25rem + var(--pro-safe-bas))" }}
        >
          {children}
        </main>
      </div>

      {/* Bandeau d'installation PWA — visible uniquement sur Android/Chrome */}
      {/* Bandeau d'installation PWA. Décidé côté serveur à partir du
          User-Agent : dans l'app native le composant n'est même pas rendu, ce
          qui évite à la fois un aller-retour d'hydratation et toute tentative
          d'inscription du Service Worker. */}
      {!dansAppNative && <PwaInstaller />}

      {/* Pont vers la coque iOS : barre d'état, écran de démarrage, APNs.
          Inerte hors de l'application native. */}
      <PontNatif />
    </div>
  );
}
