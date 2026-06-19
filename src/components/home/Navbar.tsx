import Logo from "@/components/Logo";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MenuUtilisateur from "./MenuUtilisateur";

export default async function Navbar() {
  // Lecture de la session côté serveur — pas de flash non-authentifié
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Récupère le profil pour le nom et l'avatar
  let nomComplet: string | null = null;
  let avatarUrl: string | null = null;

  let role: string | null = null;

  if (user) {
    const { data: profil } = await supabase
      .from("profils")
      .select("nom_complet, avatar_url, role")
      .eq("id", user.id)
      .single();
    nomComplet = profil?.nom_complet ?? null;
    avatarUrl = profil?.avatar_url ?? null;
    role = profil?.role ?? null;
  }

  return (
    <header
      className="sticky top-0 z-50 bg-white"
      style={{ boxShadow: "0 1px 6px rgba(15,76,58,0.08)", borderBottom: "1px solid #E8E2D2" }}
    >
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" style={{ textDecoration: "none" }}>
          <Logo />
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm" style={{ color: "#3D4A42" }}>
          <Link href="/acheter" className="hover:opacity-70 transition-opacity" style={{ textDecoration: "none", color: "inherit" }}>
            Acheter
          </Link>
          <Link href="/louer" className="hover:opacity-70 transition-opacity" style={{ textDecoration: "none", color: "inherit" }}>
            Louer
          </Link>
          <Link href="/neuf" className="hover:opacity-70 transition-opacity" style={{ textDecoration: "none", color: "inherit" }}>
            Neuf
          </Link>
          <Link href="/estimer" className="hover:opacity-70 transition-opacity" style={{ textDecoration: "none", color: "#146C43" }}>
            Estimer
          </Link>
          <Link href="/carte" className="hover:opacity-70 transition-opacity" style={{ textDecoration: "none", color: "inherit" }}>
            Carte
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Bouton publier un bien — visible connecté */}
              <Link
                href="/publier"
                className="hidden sm:inline-block text-sm px-4 py-2 rounded-lg font-semibold transition-opacity hover:opacity-90"
                style={{ background: "#D4AF37", color: "#0F4C3A", textDecoration: "none" }}
              >
                Publier un bien
              </Link>
              {/* Menu avatar/initiales avec dropdown */}
              <MenuUtilisateur
                nomComplet={nomComplet}
                email={user.email ?? null}
                avatarUrl={avatarUrl}
                role={role}
              />
            </>
          ) : (
            <>
              <Link
                href="/connexion"
                className="text-sm px-4 py-2 rounded-lg border transition-colors hover:bg-gray-50"
                style={{ borderColor: "#0F4C3A", color: "#0F4C3A", textDecoration: "none" }}
              >
                Se connecter
              </Link>
              <Link
                href="/publier"
                className="hidden sm:inline-block text-sm px-4 py-2 rounded-lg font-semibold transition-opacity hover:opacity-90"
                style={{ background: "#D4AF37", color: "#0F4C3A", textDecoration: "none" }}
              >
                Publier un bien
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
