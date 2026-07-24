import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MenuUtilisateur from "./MenuUtilisateur";
import ToggleTheme from "@/components/ui/ToggleTheme";
import NavbarShell from "./NavbarShell";
import MenuMobileHamburger from "./MenuMobileHamburger";
import LogoHoomy from "./LogoHoomy";

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
    <NavbarShell>
    <header
      style={{
        background: "var(--fond-secondaire)",
        boxShadow: "0 1px 6px rgba(15,76,58,0.08)",
        borderBottom: "1px solid var(--bordure)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">

        {/* ── Logo monogramme ─────────────────────────────────────────────── */}
        <Link href="/" style={{ textDecoration: "none" }}>
          <LogoHoomy />
        </Link>

        {/* ── Navigation desktop ──────────────────────────────────────────── */}
        <nav className="hidden md:flex items-center gap-8 text-[15px]" style={{ color: "var(--texte-corps)" }}>
          <Link href="/acheter" className="hover:opacity-70 hover:underline transition-all cursor-pointer" style={{ textDecoration: "none", color: "inherit" }}>
            Acheter
          </Link>
          <Link href="/louer" className="hover:opacity-70 hover:underline transition-all cursor-pointer" style={{ textDecoration: "none", color: "inherit" }}>
            Louer
          </Link>
          <Link href="/neuf" className="hover:opacity-70 hover:underline transition-all cursor-pointer" style={{ textDecoration: "none", color: "inherit" }}>
            Neuf
          </Link>

          {/* Demander — menu déroulant au survol (CSS pur, pas de JS nécessaire) */}
          <div className="relative group">
            <Link
              href="/demandes"
              className="hover:opacity-70 transition-all cursor-pointer inline-flex items-center gap-1"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              Demander
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </Link>
            <div className="absolute left-0 top-full pt-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
              <div
                className="rounded-xl overflow-hidden"
                style={{ background: "var(--fond-secondaire)", border: "1px solid var(--bordure)", minWidth: 200, boxShadow: "0 10px 32px rgba(15,76,58,0.16)" }}
              >
                <Link
                  href="/demandes?transaction=achat"
                  className="block px-4 py-3 text-sm hover:opacity-70 transition-opacity"
                  style={{ textDecoration: "none", color: "inherit", borderBottom: "1px solid var(--bordure)" }}
                >
                  Demande d&apos;achat
                </Link>
                <Link
                  href="/demandes?transaction=location"
                  className="block px-4 py-3 text-sm hover:opacity-70 transition-opacity"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  Demande de location
                </Link>
              </div>
            </div>
          </div>

          <Link href="/publier" className="hover:opacity-70 hover:underline transition-all cursor-pointer" style={{ textDecoration: "none", color: "var(--primaire-clair)" }}>
            Vendre
          </Link>
          <Link href="/simulateur-credit" className="hover:opacity-70 hover:underline transition-all cursor-pointer" style={{ textDecoration: "none", color: "inherit" }}>
            Crédit
          </Link>
        </nav>

        {/* ── Actions droite ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          {/* Thème jour/nuit */}
          <ToggleTheme />

          {user ? (
            <>
              {/* Bouton publier un bien — visible connecté */}
              <Link
                href="/publier"
                className="hidden sm:inline-block text-sm px-4 py-2 rounded-lg font-semibold transition-opacity hover:opacity-90"
                style={{ background: "var(--accent)", color: "var(--texte-sur-accent)", textDecoration: "none" }}
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
                className="hidden md:inline-block text-sm px-4 py-2 rounded-lg border transition-opacity hover:opacity-80"
                style={{ borderColor: "var(--bordure-action)", color: "var(--bordure-action)", textDecoration: "none" }}
              >
                Se connecter
              </Link>
              <Link
                href="/publier"
                className="hidden sm:inline-block text-sm px-4 py-2 rounded-lg font-semibold transition-opacity hover:opacity-90"
                style={{ background: "var(--accent)", color: "var(--texte-sur-accent)", textDecoration: "none" }}
              >
                Publier un bien
              </Link>
            </>
          )}

          {/* Hamburger — mobile uniquement, caché sur md+ */}
          <MenuMobileHamburger estConnecte={!!user} nomComplet={nomComplet} />
        </div>
      </div>
    </header>
    </NavbarShell>
  );
}
