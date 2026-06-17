import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import FormulaireEditionBienAgent, { type BienEditable } from "@/components/pro/FormulaireEditionBienAgent";

export const metadata: Metadata = {
  title: "Modifier le bien — Espace Pro HOOMY.MA",
};

type Props = { params: Promise<{ id: string }> };

const STATUTS_MODIFIABLES = ["brouillon", "affecte"];

export default async function PageEditionBienAgent({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: bienRaw, error } = await supabase
    .from("biens")
    .select(
      "id, reference, titre, description, type, transaction, prix, ville, quartier, " +
      "chambres, salles_bain, surface, equipements, photos, statut, agent_id"
    )
    .eq("id", id)
    .single();

  if (error || !bienRaw) notFound();

  const bien = bienRaw as unknown as BienEditable & { agent_id: string | null };

  // Vérification propriété
  if (bien.agent_id !== user.id) {
    redirect("/pro/biens");
  }

  // Statut non modifiable → rediriger
  if (!STATUTS_MODIFIABLES.includes(bien.statut ?? "")) {
    redirect("/pro/biens");
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-2">
        <Link
          href="/pro/biens"
          className="text-sm flex items-center gap-1 hover:opacity-80 transition-opacity"
          style={{ color: "#9DB8AD", textDecoration: "none" }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Mes biens
        </Link>
        <span style={{ color: "#E0DAC8" }}>/</span>
        <span className="text-sm" style={{ color: "#0F4C3A" }}>
          {bien.reference ?? bien.id.slice(0, 8)}
        </span>
      </div>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl mb-1"
            style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}
          >
            Modifier le bien
          </h1>
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            {bien.titre}
          </p>
        </div>
        {bien.reference && (
          <span
            className="text-xs px-3 py-1 rounded-full font-mono mt-1 flex-shrink-0"
            style={{ background: "#E8F5ED", color: "#0F4C3A", border: "1px solid #C6E8D4" }}
          >
            {bien.reference}
          </span>
        )}
      </div>

      {/* ── Formulaire ───────────────────────────────────────────────────── */}
      <FormulaireEditionBienAgent
        bien={bien}
        agentId={user.id}
      />

    </div>
  );
}
