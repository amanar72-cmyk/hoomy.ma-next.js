import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import type { Metadata } from "next";
import ActionsPublication from "@/components/admin/publications/ActionsPublication";
import { urlPubliqueBien, type PublicationSociale } from "@/lib/social/types";

export const metadata: Metadata = { title: "Publications sociales — Administration" };
export const dynamic = "force-dynamic";

// File des publications Facebook / Instagram. Lecture en service_role : la
// table n'est pas exposée aux rôles applicatifs. La garde de rôle est assurée
// par admin/layout.tsx (role === 'admin' strict).

type Ligne = PublicationSociale & {
  biens: { titre: string; slug: string | null; reference: string | null; transaction: string } | null;
};

const STATUTS: Record<string, { label: string; bg: string; color: string }> = {
  en_attente: { label: "En attente", bg: "#FEF3C7", color: "#92400E" },
  en_cours:   { label: "En cours",   bg: "#DBEAFE", color: "#1E40AF" },
  publie:     { label: "Publié",     bg: "#D1FAE5", color: "#065F46" },
  echec:      { label: "Échec",      bg: "#FEE2E2", color: "#991B1B" },
  annule:     { label: "Annulé",     bg: "#F3F4F6", color: "#6B7280" },
};

const RESEAUX: Record<string, { label: string; couleur: string }> = {
  facebook:  { label: "Facebook",  couleur: "#1877F2" },
  instagram: { label: "Instagram", couleur: "#C13584" },
};

function quand(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-MA", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

/** Lien vers le post réellement publié, quand l'identifiant le permet. */
function lienPost(l: Ligne): string | null {
  if (!l.id_externe) return null;
  if (l.reseau === "facebook") return `https://www.facebook.com/${l.id_externe}`;
  return "https://www.instagram.com/hoomy.ma/";
}

export default async function PageAdminPublications() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("publications_sociales")
    .select("*, biens(titre, slug, reference, transaction)")
    .order("programme_pour", { ascending: false })
    .limit(200);

  const lignes = (data ?? []) as unknown as Ligne[];
  const compte = (s: string) => lignes.filter((l) => l.statut === s).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-semibold mb-0.5" style={{ color: "#111" }}>Publications sociales</h1>
        <p className="text-sm" style={{ color: "#999" }}>
          File Facebook et Instagram — alimentée automatiquement à la validation d&apos;un bien.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl px-5 py-4 mb-4" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
          <p className="text-sm" style={{ color: "#991B1B" }}>Chargement impossible : {error.message}</p>
        </div>
      )}

      {/* Compteurs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {Object.entries(STATUTS).map(([cle, s]) => (
          <span key={cle} className="text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: s.bg, color: s.color }}>
            {s.label} · {compte(cle)}
          </span>
        ))}
      </div>

      {lignes.length === 0 && !error ? (
        <div className="rounded-2xl py-16 text-center" style={{ background: "#FAFAF8", border: "1px dashed #E8E2D2" }}>
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            Aucune publication en file. Elle se remplit quand un bien passe en « finalisé ».
          </p>
        </div>
      ) : (
        /* Cartes plutôt qu'un tableau : le back-office est consulté au téléphone,
           et un tableau à 7 colonnes y devient illisible. */
        <div className="flex flex-col gap-3">
          {lignes.map((l) => {
            const s = STATUTS[l.statut] ?? STATUTS.en_attente;
            const r = RESEAUX[l.reseau] ?? { label: l.reseau, couleur: "#666" };
            const post = lienPost(l);
            const apercu = l.type_pub === "story" ? l.medias?.[0] : null;

            return (
              <article key={l.id} className="rounded-2xl p-4 sm:p-5"
                       style={{ background: "#fff", border: "1px solid #F0EDE5" }}>
                <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
                  {/* Aperçu du visuel de story */}
                  {apercu && (
                    <a href={apercu} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={apercu} alt="Aperçu de la story"
                           className="rounded-lg object-cover"
                           style={{ width: 54, height: 96, border: "1px solid #E8E2D2" }} />
                    </a>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-bold px-2 py-0.5 rounded"
                            style={{ background: r.couleur, color: "#fff" }}>{r.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#F4F6F5", color: "#6B7A71" }}>
                        {l.type_pub === "story" ? "Story" : "Feed"}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: s.bg, color: s.color }}>{s.label}</span>
                      {l.tentatives > 0 && (
                        <span className="text-xs" style={{ color: "#9DB8AD" }}>
                          {l.tentatives} tentative{l.tentatives > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {l.biens ? (
                      <Link href={urlPubliqueBien({ slug: l.biens.slug, id: l.bien_id, transaction: l.biens.transaction })}
                            target="_blank"
                            className="text-sm font-medium hover:underline block truncate"
                            style={{ color: "#0F4C3A" }}>
                        {l.biens.titre}
                        {l.biens.reference ? ` — ${l.biens.reference}` : ""}
                      </Link>
                    ) : (
                      <p className="text-sm" style={{ color: "#9DB8AD" }}>Bien supprimé</p>
                    )}

                    <p className="text-xs mt-1" style={{ color: "#9DB8AD" }}>
                      {l.statut === "publie"
                        ? `Publié le ${quand(l.publie_le)}`
                        : `Programmé pour ${quand(l.programme_pour)}`}
                    </p>

                    {l.erreur && (
                      <p className="text-xs mt-2 rounded-lg px-3 py-2"
                         style={{ background: "#FDF3F2", color: "#B3412F", border: "1px solid #F2D6D1" }}>
                        {l.erreur}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {post && (
                      <a href={post} target="_blank" rel="noopener noreferrer"
                         className="text-xs px-3 py-1.5 rounded-lg whitespace-nowrap"
                         style={{ background: "#F0FAF4", color: "#0F4C3A", textDecoration: "none" }}>
                        Voir le post →
                      </a>
                    )}
                    <ActionsPublication id={l.id} statut={l.statut} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
