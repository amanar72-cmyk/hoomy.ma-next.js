import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CarteContactProfil from "@/components/partage/CarteContactProfil";

// Colonne latérale d'une fiche bien (admin + pro) : le VENDEUR (fiche du
// répertoire proprietaires, via biens.vendeur_id) d'un côté, les ACHETEURS
// (leads de la table leads rattachés à ce bien) de l'autre.
// Server Component partagé — la RLS fait foi : côté pro, l'agent ne voit que
// les leads que les policies lui accordent.

type Props = {
  base: "/admin" | "/pro";
  bienId: string;
  vendeurId: string | null;
};

const LIBELLES_STATUT: Record<string, string> = {
  nouveau: "Nouveau",
  contacte: "Contacté",
  qualifie: "Qualifié",
  transmis: "Transmis",
  converti: "Converti",
  perdu: "Perdu",
};

// Mêmes libellés/couleurs que la file d'affectation (/admin/leads/file)
const SCORES: Record<string, { label: string; bg: string; color: string }> = {
  chaud: { label: "🔥 Chaud", bg: "#D4AF37", color: "#0F4C3A" },
  tiede: { label: "Tiède", bg: "#FEF3C7", color: "#92400E" },
  froid: { label: "Froid", bg: "#E5E7EB", color: "#4B5563" },
};

type LeadBien = {
  id: string;
  nom: string | null;
  telephone: string | null;
  statut: string | null;
  score: string | null;
  cree_le: string;
  contact_id: string | null;
};

export default async function VendeurEtAcheteursBien({ base, bienId, vendeurId }: Props) {
  const supabase = await createClient();

  const [vendeurRes, leadsRes] = await Promise.all([
    vendeurId
      ? supabase
          .from("proprietaires")
          .select("id, nom, prenom, telephone, email")
          .eq("id", vendeurId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("leads")
      .select("id, nom, telephone, statut, score, cree_le, contact_id")
      .eq("bien_id", bienId)
      .order("cree_le", { ascending: false })
      .limit(20),
  ]);

  const vendeur = vendeurRes.data;
  const leads = (leadsRes.data ?? []) as LeadBien[];

  return (
    <>
      {/* ── Vendeur (répertoire propriétaires) ─────────────────────────────── */}
      <CarteContactProfil
        titre="Propriétaire (vendeur)"
        profil={
          vendeur
            ? {
                nom_complet: [vendeur.prenom, vendeur.nom].filter(Boolean).join(" "),
                email: vendeur.email,
                telephone: vendeur.telephone,
              }
            : null
        }
        vide="Aucun vendeur du répertoire — bien créé avant le répertoire propriétaires."
      >
        {vendeur && (
          <Link
            href={`${base}/proprietaires/${vendeur.id}`}
            className="block text-xs text-center mt-3 hover:underline"
            style={{ color: "#9DB8AD", textDecoration: "none" }}
          >
            Voir la fiche propriétaire →
          </Link>
        )}
      </CarteContactProfil>

      {/* ── Acheteurs (leads rattachés à ce bien) ──────────────────────────── */}
      <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid #F0EDE5" }}>
        <p className="text-xs font-semibold mb-4 uppercase tracking-wider" style={{ color: "#9DB8AD" }}>
          Acheteurs intéressés ({leads.length})
        </p>

        {leadsRes.error ? (
          <p className="text-sm" style={{ color: "#B3412F" }}>
            Chargement des leads impossible : {leadsRes.error.message}
          </p>
        ) : leads.length === 0 ? (
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            Aucun lead rattaché à ce bien pour le moment.
          </p>
        ) : (
          <ul className="flex flex-col">
            {leads.map((l) => {
              const couleurScore = l.score ? SCORES[l.score] : undefined;
              const contenu = (
                <>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#3D4A42" }}>
                      {l.nom ?? "—"}
                    </p>
                    <p className="text-xs" style={{ color: "#9DB8AD" }}>
                      {l.telephone ?? "—"} · {new Date(l.cree_le).toLocaleDateString("fr-MA")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {couleurScore && (
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: couleurScore.bg, color: couleurScore.color }}
                      >
                        {couleurScore.label}
                      </span>
                    )}
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: "#F4F6F5", color: "#6B7A71" }}
                    >
                      {LIBELLES_STATUT[l.statut ?? ""] ?? l.statut ?? "—"}
                    </span>
                  </div>
                </>
              );
              const classes = "flex items-center justify-between gap-2 py-2.5";
              return (
                <li key={l.id} style={{ borderBottom: "1px solid #F7F5EF" }}>
                  {/* La fiche contact n'existe que côté admin */}
                  {base === "/admin" && l.contact_id ? (
                    <Link href={`/admin/contacts/${l.contact_id}`} className={`${classes} hover:opacity-80`}>
                      {contenu}
                    </Link>
                  ) : (
                    <div className={classes}>{contenu}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
