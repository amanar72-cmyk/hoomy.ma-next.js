import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

// ── Carte de statistique ──────────────────────────────────────────────────────

function Stat({
  label,
  valeur,
  accent = false,
  href,
}: {
  label: string;
  valeur: number | string;
  accent?: boolean;
  href?: string;
}) {
  const contenu = (
    <div
      className="rounded-2xl p-5 flex flex-col gap-1.5"
      style={{
        background: "#fff",
        border: "1px solid #EBEBEB",
        boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
      }}
    >
      <p className="text-xs font-medium" style={{ color: "#999" }}>{label}</p>
      <p
        className="text-2xl font-semibold"
        style={{ color: accent ? "#D4AF37" : "#111", letterSpacing: -0.5 }}
      >
        {valeur}
      </p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: "none" }} className="hover:opacity-90 transition-opacity duration-150">
        {contenu}
      </Link>
    );
  }
  return contenu;
}

// ── Composant badge statut ────────────────────────────────────────────────────

const BADGE_STATUT: Record<string, { label: string; bg: string; color: string }> = {
  brouillon:    { label: "Brouillon",    bg: "#F5F5F5", color: "#777" },
  affecte:      { label: "Affecté",      bg: "#FEF3C7", color: "#92400E" },
  en_validation:{ label: "En validation",bg: "#DBEAFE", color: "#1E40AF" },
  finalise:     { label: "Publié",        bg: "#D1FAE5", color: "#065F46" },
  transacte:    { label: "Transacté",    bg: "#F3E8FF", color: "#6B21A8" },
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PageTableauDeBordPro() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profil } = await supabase
    .from("profils")
    .select("nom_complet, role")
    .eq("id", user.id)
    .single();

  const prenom = (profil?.nom_complet ?? user.email ?? "").split(" ")[0];
  const heure = new Date().getHours();
  const salutation = heure < 12 ? "Bonjour" : heure < 18 ? "Bon après-midi" : "Bonsoir";

  // Statistiques agent
  const [
    { count: totalBiens },
    { count: biensActifs },
    { count: biensEnCours },
    { count: biensEnAttente },
    { data: derniersBiens },
  ] = await Promise.all([
    supabase.from("biens").select("*", { count: "exact", head: true }).eq("agent_id", user.id),
    supabase.from("biens").select("*", { count: "exact", head: true }).eq("agent_id", user.id).eq("statut", "finalise"),
    supabase.from("biens").select("*", { count: "exact", head: true }).eq("agent_id", user.id).in("statut", ["brouillon", "affecte"]),
    supabase.from("biens").select("*", { count: "exact", head: true }).eq("agent_id", user.id).eq("statut", "en_validation"),
    supabase
      .from("biens")
      .select("id, titre, type, transaction, prix, ville, statut, photos")
      .eq("agent_id", user.id)
      .order("cree_le", { ascending: false })
      .limit(5),
  ]);

  const biens = (derniersBiens ?? []) as Array<{
    id: string;
    titre: string;
    type: string;
    transaction: string;
    prix: number;
    ville: string;
    statut: string | null;
    photos: string[] | null;
  }>;

  const date = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="max-w-4xl mx-auto">

      {/* En-tête */}
      <div className="mb-7">
        <h1 className="text-xl font-semibold mb-0.5" style={{ color: "#111" }}>
          {salutation}, {prenom}
        </h1>
        <p className="text-sm" style={{ color: "#999", textTransform: "capitalize" }}>{date}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="Mes biens" valeur={totalBiens ?? 0} href="/pro/biens" />
        <Stat label="Publiés" valeur={biensActifs ?? 0} accent href="/pro/biens" />
        <Stat label="En cours" valeur={biensEnCours ?? 0} href="/pro/biens" />
        <Stat label="En validation" valeur={biensEnAttente ?? 0} href="/pro/biens" />
      </div>

      {/* Accès rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { href: "/pro/biens/nouveau", label: "Nouveau bien", ico: "+" },
          { href: "/pro/leads",         label: "Leads",        ico: "↗" },
          { href: "/pro/calendrier",    label: "Calendrier",   ico: "◻" },
          { href: "/pro/file",          label: "File d'affectation", ico: "≡" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl px-4 py-3 flex items-center gap-2.5 hover:opacity-80 transition-opacity duration-150"
            style={{
              background: "#fff",
              border: "1px solid #EBEBEB",
              color: "#333",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <span style={{ color: "#D4AF37", fontWeight: 700, fontSize: 15 }}>{item.ico}</span>
            {item.label}
          </Link>
        ))}
      </div>

      {/* Derniers biens */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: "#111" }}>Mes derniers biens</h2>
          <Link href="/pro/biens" className="text-xs hover:underline" style={{ color: "#999" }}>
            Voir tout →
          </Link>
        </div>

        {biens.length === 0 ? (
          <div
            className="rounded-2xl py-12 text-center"
            style={{ background: "#fff", border: "1px dashed #E0E0E0" }}
          >
            <p className="text-sm font-medium mb-1" style={{ color: "#333" }}>Aucun bien pour l'instant</p>
            <p className="text-xs mb-4" style={{ color: "#999" }}>Créez votre premier bien ou acceptez-en depuis la file.</p>
            <Link
              href="/pro/biens/nouveau"
              className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
              style={{ background: "#111", color: "#fff", textDecoration: "none" }}
            >
              + Créer un bien
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {biens.map((b) => {
              const photo = Array.isArray(b.photos) && b.photos.length > 0 ? b.photos[0] : null;
              const badge = BADGE_STATUT[b.statut ?? ""] ?? { label: b.statut ?? "—", bg: "#F5F5F5", color: "#777" };
              return (
                <Link
                  key={b.id}
                  href={`/pro/biens/${b.id}`}
                  className="flex items-center gap-4 rounded-xl p-3 hover:opacity-80 transition-opacity duration-150"
                  style={{ background: "#fff", border: "1px solid #EBEBEB", textDecoration: "none" }}
                >
                  {/* Miniature */}
                  <div
                    className="rounded-lg overflow-hidden flex-shrink-0"
                    style={{ width: 56, height: 44, background: "#F5F5F5" }}
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ fontSize: 18 }}>🏠</div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#111" }}>{b.titre}</p>
                    <p className="text-xs" style={{ color: "#999" }}>
                      {b.type} · {b.ville} ·{" "}
                      <span style={{ color: "#111", fontWeight: 600 }}>
                        {b.prix.toLocaleString("fr-FR")} DH{b.transaction === "location" ? "/mois" : ""}
                      </span>
                    </p>
                  </div>

                  {/* Badge statut */}
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {badge.label}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
