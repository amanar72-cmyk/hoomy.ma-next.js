import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import BoutonActionPro from "@/components/pro/BoutonActionPro";
import BarreRecherche from "@/components/pro/BarreRecherche";
import Pagination from "@/components/pro/Pagination";
import CarteBienListe, { type BienListe } from "@/components/partage/CarteBienListe";
import { transmettreAuBo } from "./actions";
import { nbDocsParFiche, TYPES_DOCUMENTS_FICHE } from "@/lib/documents/fiche";
import { infoStatut, ORDRE_STATUTS_BIEN } from "@/lib/biens/statuts";
import { peutEtreVisualise, urlPubliqueBien } from "@/lib/biens/lienPublic";
import BoutonVisualiserBien from "@/components/partage/BoutonVisualiserBien";

export const metadata: Metadata = {
  title: "Mes biens — Espace Pro HOOMY.MA",
};

const PAR_PAGE = 10;

// Statuts où l'agent peut encore transmettre le bien au back-office
const STATUTS_A_TRANSMETTRE = ["brouillon", "affecte"];

const TRIS = [
  { value: "recent", label: "Le plus récent" },
  { value: "prix_desc", label: "Prix décroissant" },
  { value: "prix_asc", label: "Prix croissant" },
] as const;

type SearchParams = Promise<{
  q?: string;
  transaction?: string;
  statut?: string;
  tri?: string;
  page?: string;
}>;

function urlAvec(params: Record<string, string | undefined>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) usp.set(k, v);
  const s = usp.toString();
  return `/pro/biens${s ? `?${s}` : ""}`;
}

export default async function PageProMesBiens({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const transaction = sp.transaction ?? "";
  const statut = sp.statut ?? "";
  const tri = sp.tri ?? "recent";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  // Nettoyage pour la syntaxe or() de PostgREST (virgules/parenthèses réservées)
  const qFiltre = q.replace(/[,()]/g, " ").trim();

  // ── Biens de la page (RLS + filtre agent) ──────────────────────────────────
  // select("*") : tolère l'absence de la colonne date_publication tant que
  // date_publication.sql n'a pas été exécuté.
  let query = supabase
    .from("biens")
    .select("*", { count: "exact" })
    .eq("agent_id", user.id);

  if (transaction) query = query.eq("transaction", transaction);
  if (statut) query = query.eq("statut", statut);
  if (qFiltre) query = query.or(`titre.ilike.%${qFiltre}%,reference.ilike.%${qFiltre}%`);

  if (tri === "prix_asc") query = query.order("prix", { ascending: true });
  else if (tri === "prix_desc") query = query.order("prix", { ascending: false });
  else query = query.order("cree_le", { ascending: false });

  const de = (page - 1) * PAR_PAGE;
  const { data: biensRaw, count } = await query.range(de, de + PAR_PAGE - 1);
  const biens = (biensRaw ?? []) as unknown as (BienListe & { slug: string | null; photos: unknown })[];
  const total = count ?? 0;

  // ── Comptages par statut pour les chips (mêmes filtres, hors statut) ───────
  let queryChips = supabase.from("biens").select("statut").eq("agent_id", user.id);
  if (transaction) queryChips = queryChips.eq("transaction", transaction);
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

  // ── Documents (N/3) et demandes de visite — 1 requête chacun ───────────────
  const ids = biens.map((b) => b.id);
  const [docsParBien, demandesRes] = await Promise.all([
    nbDocsParFiche(supabase, ids),
    ids.length > 0
      ? supabase.from("demandes_visite").select("bien_id").in("bien_id", ids)
      : Promise.resolve({ data: [] as { bien_id: string }[] }),
  ]);
  const demandesParBien = new Map<string, number>();
  for (const d of (demandesRes.data ?? []) as { bien_id: string }[]) {
    demandesParBien.set(d.bien_id, (demandesParBien.get(d.bien_id) ?? 0) + 1);
  }

  const baseUrlPagination = urlAvec({ q, transaction, statut, tri: tri !== "recent" ? tri : undefined });

  return (
    <div className="max-w-4xl mx-auto">

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1
            className="text-2xl font-normal mb-1"
            style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}
          >
            Mes biens
          </h1>
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            Total des biens : {total}
          </p>
        </div>
        <Link
          href="/pro/biens/nouveau"
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          style={{ background: "#D4AF37", color: "#0F4C3A", textDecoration: "none" }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Créer un bien
        </Link>
      </div>

      {/* ── Recherche + tri ──────────────────────────────────────────────── */}
      <form method="get" action="/pro/biens" className="flex gap-2 mb-4 flex-wrap">
        {transaction && <input type="hidden" name="transaction" value={transaction} />}
        {statut && <input type="hidden" name="statut" value={statut} />}
        <BarreRecherche defaultValue={q} placeholder="Rechercher par titre ou référence…" />
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
          Rechercher
        </button>
      </form>

      {/* ── Filtre transaction ───────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl w-fit mb-4" style={{ background: "#E8E4DA" }}>
        {[
          { label: "Tous", value: "" },
          { label: "Vente", value: "vente" },
          { label: "Location", value: "location" },
        ].map((o) => {
          const actif = transaction === o.value;
          return (
            <Link
              key={o.value}
              href={urlAvec({ q, statut, tri: tri !== "recent" ? tri : undefined, transaction: o.value || undefined })}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={
                actif
                  ? { background: "#fff", color: "#0F4C3A", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", textDecoration: "none" }
                  : { color: "#6B7A71", textDecoration: "none" }
              }
            >
              {o.label}
            </Link>
          );
        })}
      </div>

      {/* ── Chips statut (statuts réellement présents en base) ──────────── */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Link
          href={urlAvec({ q, transaction, tri: tri !== "recent" ? tri : undefined })}
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
              href={urlAvec({ q, transaction, tri: tri !== "recent" ? tri : undefined, statut: s })}
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

      {/* ── État vide ────────────────────────────────────────────────────── */}
      {biens.length === 0 && (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-16 px-6 text-center"
          style={{ background: "#fff", border: "1px solid #F0EDE5" }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "#F0FAF4" }}
          >
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#0F4C3A" strokeWidth="1.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: "#0F4C3A" }}>
            {total === 0 && !q && !statut && !transaction
              ? "Aucun bien en portefeuille"
              : "Aucun bien ne correspond à ces filtres"}
          </p>
          <p className="text-sm mb-4" style={{ color: "#9DB8AD" }}>
            {total === 0 && !q && !statut && !transaction
              ? "Créez votre premier bien ou acceptez-en un depuis la file d'affectation."
              : "Modifiez la recherche ou les filtres pour élargir les résultats."}
          </p>
          <Link
            href="/pro/biens/nouveau"
            className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
            style={{ background: "#0F4C3A", color: "#fff", textDecoration: "none" }}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Créer un bien
          </Link>
        </div>
      )}

      {/* ── Liste des biens ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {biens.map((bien) => {
          const nbDocs = docsParBien.get(bien.id) ?? 0;
          const docsComplets = nbDocs >= TYPES_DOCUMENTS_FICHE.length;
          const aTransmettre = STATUTS_A_TRANSMETTRE.includes(bien.statut ?? "");
          // URL absolue vers hoomy.ma — un chemin relatif resterait sur
          // pro.hoomy.ma (voir lib/biens/lienPublic.ts).
          const estPublie = peutEtreVisualise(bien.statut);
          const lienAnnonce = urlPubliqueBien(bien);

          return (
            <CarteBienListe
              key={bien.id}
              bien={bien}
              href={`/pro/biens/${bien.id}`}
              photo={Array.isArray(bien.photos) ? ((bien.photos as string[])[0] ?? null) : null}
              nbDemandesVisite={demandesParBien.get(bien.id) ?? 0}
              nbDocs={nbDocs}
              actions={
                aTransmettre ? (
                  docsComplets ? (
                    <BoutonActionPro
                      action={transmettreAuBo.bind(null, bien.id)}
                      label="Transmettre au BO"
                      labelChargement="Transmission…"
                      confirmation="Confirmer la transmission de ce bien au back-office pour publication ?"
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap"
                      style={{ background: "#0F4C3A", color: "#fff", cursor: "pointer" }}
                    />
                  ) : (
                    <button
                      type="button"
                      disabled
                      title="Déposez les 3 documents (mandat, CIN, certificat) avant d'envoyer au back-office."
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl cursor-not-allowed whitespace-nowrap"
                      style={{ background: "#E8E4DA", color: "#9DB8AD", border: "none" }}
                    >
                      Transmettre au BO
                    </button>
                  )
                ) : estPublie ? (
                  <BoutonVisualiserBien
                    href={lienAnnonce}
                    actif
                    statut={bien.statut}
                    compact
                  />
                ) : (
                  <span
                    className="text-xs font-medium px-3 py-1.5 rounded-xl whitespace-nowrap"
                    style={{ background: "#F4F6F5", color: "#6B7A71" }}
                  >
                    Ouvrir →
                  </span>
                )
              }
            />
          );
        })}
      </div>

      <Pagination page={page} total={total} parPage={PAR_PAGE} baseUrl={baseUrlPagination} />
    </div>
  );
}
