import { supabase } from "@/lib/supabase";
import Link from "next/link";
import type { Bien } from "@/lib/types";
import CarteAnnonce from "@/components/annonces/CarteAnnonce";

type Props = {
  ville: string;
  type: string;
  transaction: string;
  idExclu: string;
  quartier?: string | null;
  prix: number;
  chambres: number;
};

// ── Scoring de similarité ─────────────────────────────────────────────────────
// Critères par ordre de priorité décroissante :
//   +3  même type de bien (appartement, villa, riad…)
//   +2  même quartier (bonus géographique fin)
//   +2  prix dans la fourchette ±30 % du bien de référence
//   +1  nombre de chambres à ±1 du bien de référence
// Score max théorique : 8

function calculerScore(
  candidat: Bien,
  ref: { type: string; quartier: string | null; prix: number; chambres: number }
): number {
  let score = 0;
  if (candidat.type === ref.type) score += 3;
  if (ref.quartier && candidat.quartier === ref.quartier) score += 2;
  if (candidat.prix >= ref.prix * 0.7 && candidat.prix <= ref.prix * 1.3) score += 2;
  if (Math.abs(candidat.chambres - ref.chambres) <= 1) score += 1;
  return score;
}

export default async function BiensSimiliaires({
  ville,
  type,
  transaction,
  idExclu,
  quartier,
  prix,
  chambres,
}: Props) {
  // ── Phase 1 : même transaction + même ville (candidats primaires) ──────────
  const { data: villeData } = await supabase
    .from("biens")
    .select("*")
    .eq("transaction", transaction)
    .eq("ville", ville)
    .neq("id", idExclu)
    .limit(20);

  let candidats = (villeData ?? []) as Bien[];

  // ── Phase 2 : élargissement si < 3 résultats ──────────────────────────────
  // Cherche le même type dans d'autres villes pour toujours avoir des suggestions
  if (candidats.length < 3) {
    const { data: typeData } = await supabase
      .from("biens")
      .select("*")
      .eq("transaction", transaction)
      .eq("type", type)
      .neq("id", idExclu)
      .neq("ville", ville)
      .limit(15);

    const ids = new Set(candidats.map((b) => b.id));
    for (const b of (typeData ?? []) as Bien[]) {
      if (!ids.has(b.id)) candidats.push(b);
    }
  }

  if (candidats.length === 0) return null;

  // ── Tri par score décroissant, top 3 ──────────────────────────────────────
  const ref = { type, quartier: quartier ?? null, prix, chambres };
  const top3 = candidats
    .map((b) => ({ bien: b, score: calculerScore(b, ref) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.bien);

  if (top3.length === 0) return null;

  const prefixe = transaction === "location" ? "louer" : "acheter";
  const lienVoir =
    `/${prefixe}?ville=${encodeURIComponent(ville)}&type=${encodeURIComponent(type)}`;

  return (
    <section className="py-16 px-6" style={{ background: "var(--fond-accent)" }}>
      <div className="max-w-7xl mx-auto">

        {/* ── En-tête ─────────────────────────────────────────────────── */}
        <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
          <div>
            <p
              className="text-xs font-medium tracking-widest uppercase mb-2"
              style={{ color: "var(--accent)" }}
            >
              Découvrir aussi
            </p>
            <h2
              className="text-2xl font-normal"
              style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}
            >
              Biens similaires à {ville}
            </h2>
          </div>
          <Link
            href={lienVoir}
            className="text-sm font-medium flex items-center gap-1.5 transition-all hover:gap-3"
            style={{ color: "var(--primaire-clair)", textDecoration: "none" }}
          >
            Voir plus
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>

        {/* ── Grille de cartes ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {top3.map((bien) => (
            <CarteAnnonce key={bien.id} bien={bien} />
          ))}
        </div>

        {/* ── Bouton "Voir plus" bas de section ────────────────────────── */}
        <div className="flex justify-center mt-10">
          <Link
            href={lienVoir}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-medium transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: "var(--primaire)",
              color: "var(--fond-secondaire)",
              textDecoration: "none",
              boxShadow: "0 4px 20px rgba(15,76,58,0.22)",
            }}
          >
            Voir plus de {type.toLowerCase()}s à {ville}
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>

      </div>
    </section>
  );
}
