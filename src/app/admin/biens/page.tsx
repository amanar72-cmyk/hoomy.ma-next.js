import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import BarreRecherche from "@/components/pro/BarreRecherche";
import Pagination from "@/components/pro/Pagination";
import CarteBienListe, { type BienListe } from "@/components/partage/CarteBienListe";
import BoutonSupprimer from "@/components/admin/BoutonSupprimer";
import { verifierBien, deverifierBien } from "@/app/admin/actions";
import { urlsPhotosNettes } from "@/lib/images/photosBien";
import { nbDocsParFiche } from "@/lib/documents/fiche";
import { infoStatut, ORDRE_STATUTS_BIEN } from "@/lib/biens/statuts";

const PAR_PAGE = 10;

const TRIS = [
  { value: "recent", label: "Le plus récent" },
  { value: "prix_desc", label: "Prix décroissant" },
  { value: "prix_asc", label: "Prix croissant" },
] as const;

type SearchParams = Promise<{
  q?: string;
  ville?: string;
  type?: string;
  statut?: string;
  tri?: string;
  page?: string;
}>;

function urlAvec(params: Record<string, string | undefined>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) usp.set(k, v);
  const s = usp.toString();
  return `/admin/biens${s ? `?${s}` : ""}`;
}

export default async function PageAdminBiens({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const ville = sp.ville ?? "";
  const type = sp.type ?? "";
  const statut = sp.statut ?? "";
  const tri = sp.tri ?? "recent";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const supabase = await createClient();

  // Nettoyage pour la syntaxe or() de PostgREST (virgules/parenthèses réservées)
  const qFiltre = q.replace(/[,()]/g, " ").trim();

  // ── Biens de la page (RLS is_admin — accès complet) ────────────────────────
  // select("*") : tolère l'absence de la colonne date_publication tant que
  // date_publication.sql n'a pas été exécuté.
  let query = supabase.from("biens").select("*", { count: "exact" });

  if (ville) query = query.eq("ville", ville);
  if (type) query = query.eq("type", type);
  if (statut) query = query.eq("statut", statut);
  if (qFiltre) query = query.or(`titre.ilike.%${qFiltre}%,reference.ilike.%${qFiltre}%`);

  if (tri === "prix_asc") query = query.order("prix", { ascending: true });
  else if (tri === "prix_desc") query = query.order("prix", { ascending: false });
  else query = query.order("cree_le", { ascending: false });

  const de = (page - 1) * PAR_PAGE;
  const { data: biensRaw, count } = await query.range(de, de + PAR_PAGE - 1);
  const biens = (biensRaw ?? []) as unknown as (BienListe & {
    agent_id: string | null;
    photos: unknown;
    photos_originales: unknown;
  })[];
  const total = count ?? 0;

  // ── Comptages par statut pour les chips (mêmes filtres, hors statut) ───────
  let queryChips = supabase.from("biens").select("statut");
  if (ville) queryChips = queryChips.eq("ville", ville);
  if (type) queryChips = queryChips.eq("type", type);
  if (qFiltre) queryChips = queryChips.or(`titre.ilike.%${qFiltre}%,reference.ilike.%${qFiltre}%`);
  const { data: statutsRaw } = await queryChips;
  const comptages = new Map<string, number>();
  for (const r of (statutsRaw ?? []) as { statut: string | null }[]) {
    const s = r.statut ?? "";
    comptages.set(s, (comptages.get(s) ?? 0) + 1);
  }
  const totalChips = statutsRaw?.length ?? 0;
  // Chips construits à partir des statuts réellement présents, dans l'ordre du cycle de vie
  const statutsPresents = [
    ...ORDRE_STATUTS_BIEN.filter((s) => comptages.has(s)),
    ...[...comptages.keys()].filter((s) => s && !ORDRE_STATUTS_BIEN.includes(s)),
  ];

  // ── Données annexes : photos nettes, conseillers, documents, demandes ──────
  const ids = biens.map((b) => b.id);
  const agentIds = [...new Set(biens.map((b) => b.agent_id).filter((id): id is string => !!id))];

  const [photosNettes, agentsRes, docsParBien, demandesRes] = await Promise.all([
    Promise.all(
      biens.map(async (b) =>
        (await urlsPhotosNettes(
          Array.isArray(b.photos) ? (b.photos as string[]) : [],
          Array.isArray(b.photos_originales) ? (b.photos_originales as string[]) : [],
          b.verifie
        ))[0] ?? null
      )
    ),
    agentIds.length > 0
      ? supabase.from("profils").select("id, nom_complet").in("id", agentIds)
      : Promise.resolve({ data: [] as { id: string; nom_complet: string | null }[] }),
    nbDocsParFiche(supabase, ids),
    ids.length > 0
      ? supabase.from("demandes_visite").select("bien_id").in("bien_id", ids)
      : Promise.resolve({ data: [] as { bien_id: string }[] }),
  ]);

  const agentMap = Object.fromEntries(
    ((agentsRes.data ?? []) as { id: string; nom_complet: string | null }[]).map((a) => [a.id, a.nom_complet ?? "—"])
  );
  const demandesParBien = new Map<string, number>();
  for (const d of (demandesRes.data ?? []) as { bien_id: string }[]) {
    demandesParBien.set(d.bien_id, (demandesParBien.get(d.bien_id) ?? 0) + 1);
  }

  const VILLES = ["Casablanca", "Marrakech", "Rabat", "Tanger", "Agadir", "Fès"];
  const TYPES = ["Appartement", "Villa", "Riad", "Bureau", "Terrain"];
  const baseUrlPagination = urlAvec({ q, ville, type, statut, tri: tri !== "recent" ? tri : undefined });

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1
            className="text-2xl font-normal mb-1"
            style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}
          >
            Gestion des biens
          </h1>
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            Total des biens : {total}
          </p>
        </div>
        <Link
          href="/admin/biens/nouveau"
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          style={{ background: "#D4AF37", color: "#0F4C3A", textDecoration: "none" }}
        >
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nouveau bien
        </Link>
      </div>

      {/* ── Recherche + filtres + tri ────────────────────────────────────── */}
      <form method="get" action="/admin/biens" className="flex flex-wrap gap-2 mb-4">
        {statut && <input type="hidden" name="statut" value={statut} />}
        <BarreRecherche defaultValue={q} placeholder="Rechercher par titre ou référence…" />
        <select
          name="ville"
          defaultValue={ville}
          className="border rounded-xl px-3 py-2.5 text-sm"
          style={{ borderColor: "#E0DAC8", color: "#0F4C3A", background: "#fff" }}
        >
          <option value="">Toutes les villes</option>
          {VILLES.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select
          name="type"
          defaultValue={type}
          className="border rounded-xl px-3 py-2.5 text-sm"
          style={{ borderColor: "#E0DAC8", color: "#0F4C3A", background: "#fff" }}
        >
          <option value="">Tous les types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          name="tri"
          defaultValue={tri}
          className="border rounded-xl px-3 py-2.5 text-sm"
          style={{ borderColor: "#E0DAC8", color: "#0F4C3A", background: "#fff" }}
        >
          {TRIS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity"
          style={{ background: "#0F4C3A", color: "#fff" }}
        >
          Filtrer
        </button>
      </form>

      {/* ── Chips statut (statuts réellement présents en base) ──────────── */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Link
          href={urlAvec({ q, ville, type, tri: tri !== "recent" ? tri : undefined })}
          className="text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
          style={
            !statut
              ? { background: "#0F4C3A", color: "#fff", textDecoration: "none" }
              : { background: "#fff", color: "#0F4C3A", border: "1px solid #E0DAC8", textDecoration: "none" }
          }
        >
          Tous ({totalChips})
        </Link>
        {statutsPresents.map((s) => {
          const info = infoStatut(s);
          const actif = statut === s;
          return (
            <Link
              key={s}
              href={urlAvec({ q, ville, type, tri: tri !== "recent" ? tri : undefined, statut: s })}
              className="text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
              style={
                actif
                  ? { background: "#0F4C3A", color: "#fff", textDecoration: "none" }
                  : { background: info.bg, color: info.color, textDecoration: "none" }
              }
            >
              {info.label} ({comptages.get(s) ?? 0})
            </Link>
          );
        })}
      </div>

      {/* ── Liste ────────────────────────────────────────────────────────── */}
      {biens.length === 0 ? (
        <div
          className="rounded-2xl py-14 text-center"
          style={{ background: "#fff", border: "1px solid #F0EDE5" }}
        >
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            Aucun bien ne correspond aux filtres
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {biens.map((bien, i) => (
            <CarteBienListe
              key={bien.id}
              bien={bien}
              href={`/admin/biens/${bien.id}`}
              photo={photosNettes[i]}
              nbDemandesVisite={demandesParBien.get(bien.id) ?? 0}
              nbDocs={docsParBien.get(bien.id) ?? 0}
              agentNom={bien.agent_id ? (agentMap[bien.agent_id] ?? null) : null}
              actions={
                <>
                  {bien.verifie ? (
                    <form action={deverifierBien.bind(null, bien.id)}>
                      <button
                        type="submit"
                        className="text-xs px-3 py-1.5 rounded-xl font-medium cursor-pointer whitespace-nowrap"
                        style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}
                      >
                        Dévérifier
                      </button>
                    </form>
                  ) : (
                    <form action={verifierBien.bind(null, bien.id)}>
                      <button
                        type="submit"
                        className="text-xs px-3 py-1.5 rounded-xl font-medium cursor-pointer whitespace-nowrap"
                        style={{ background: "#F0FAF4", color: "#0F4C3A", border: "1px solid #C6E8D4" }}
                      >
                        Vérifier
                      </button>
                    </form>
                  )}
                  <BoutonSupprimer id={bien.id} titre={bien.titre} />
                </>
              }
            />
          ))}
        </div>
      )}

      <Pagination page={page} total={total} parPage={PAR_PAGE} baseUrl={baseUrlPagination} />
    </div>
  );
}
