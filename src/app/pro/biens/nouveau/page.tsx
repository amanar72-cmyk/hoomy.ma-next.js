import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import FormulaireCreationBienAgent from "@/components/pro/FormulaireCreationBienAgent";

export const metadata: Metadata = {
  title: "Créer un bien — Espace Pro",
};

type SearchParams = Promise<{ vendeur?: string }>;

export default async function PageNouveauBienAgent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profil } = await supabase
    .from("profils")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profil || !["agent", "agence"].includes(profil.role ?? "")) {
    redirect("/pro");
  }

  // Répertoire propriétaires (RLS est_pro) + pré-sélection depuis une fiche
  // (« Ajouter un bien » → ?vendeur=<id>). Id inconnu → simplement ignoré.
  const sp = await searchParams;
  const { data: proprietaires } = await supabase
    .from("proprietaires")
    .select("id, nom, prenom, telephone")
    .order("nom");
  const vendeurInitial =
    sp.vendeur && (proprietaires ?? []).some((p) => p.id === sp.vendeur)
      ? sp.vendeur
      : null;

  return (
    <div className="max-w-2xl mx-auto">

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/pro/biens"
          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors hover:opacity-80"
          style={{ background: "#F0EDE5", color: "#6B7A71", textDecoration: "none" }}
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Retour
        </Link>
        <div>
          <h1
            className="text-2xl font-normal"
            style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}
          >
            Créer un bien
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "#9DB8AD" }}>
            Le bien sera créé en brouillon — transmettez-le au back-office quand il est prêt.
          </p>
        </div>
      </div>

      {/* ── Formulaire ───────────────────────────────────────────────────── */}
      <FormulaireCreationBienAgent
        proprietaires={proprietaires ?? []}
        vendeurInitial={vendeurInitial}
      />

    </div>
  );
}
