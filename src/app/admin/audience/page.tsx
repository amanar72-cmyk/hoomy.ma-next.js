import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { LIBELLE_SOURCE, type SourceAudience } from "@/lib/mesure/source";

// Audience du site public — mesure interne SANS cookie (table mesure_audience).
// Contrairement à GA4 et au pixel Meta, elle compte TOUS les visiteurs, qu'ils
// aient accepté le bandeau cookies ou non. Lecture via la RPC stats_audience
// (service_role), derrière la garde admin du layout /admin.

export const dynamic = "force-dynamic";

type Stats = {
  visites: number;
  pages: number;
  par_jour: { jour: string; visites: number; pages: number }[];
  par_source: { source: string; visites: number }[];
  par_appareil: { appareil: string; visites: number }[];
  top_pages: { chemin: string; vues: number }[];
  top_biens: { reference_bien: string; vues: number; vues_meta: number }[];
};

const PERIODES = [7, 30, 90] as const;

const VERT = "#0F4C3A";
const OR = "#D4AF37";

type SearchParams = Promise<{ jours?: string }>;

/** Début de la période analysée (page dynamique : recalculé à chaque requête). */
function debutPeriode(jours: number): string {
  return new Date(Date.now() - jours * 24 * 60 * 60 * 1000).toISOString();
}

function libelleSource(s: string): string {
  return LIBELLE_SOURCE[s as SourceAudience] ?? s;
}

function formatJour(jour: string): string {
  // jour = "2026-10-13" (date locale Maroc, sans heure)
  const [a, m, j] = jour.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, j)).toLocaleDateString("fr-MA", {
    weekday: "short", day: "2-digit", month: "short", timeZone: "UTC",
  });
}

// ── Petits blocs d'affichage ────────────────────────────────────────────────

function Carte({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl p-5" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
      <h2 className="text-sm font-semibold mb-4" style={{ color: VERT }}>{titre}</h2>
      {children}
    </section>
  );
}

function Chiffre({ valeur, libelle }: { valeur: string; libelle: string }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
      <div className="text-3xl" style={{ fontFamily: "var(--font-marcellus), serif", color: VERT }}>{valeur}</div>
      <div className="text-xs mt-1" style={{ color: "#888" }}>{libelle}</div>
    </div>
  );
}

function Barres({ lignes }: { lignes: { libelle: string; valeur: number; detail?: string }[] }) {
  if (lignes.length === 0) {
    return <p className="text-sm" style={{ color: "#999" }}>Aucune donnée sur la période.</p>;
  }
  const max = Math.max(...lignes.map((l) => l.valeur), 1);
  return (
    <ul className="space-y-2.5">
      {lignes.map((l) => (
        <li key={l.libelle}>
          <div className="flex justify-between text-sm mb-1 gap-3">
            <span className="truncate" style={{ color: "#222" }} title={l.libelle}>{l.libelle}</span>
            <span className="whitespace-nowrap font-semibold" style={{ color: VERT }}>
              {l.valeur.toLocaleString("fr-MA")}
              {l.detail && <span className="font-normal" style={{ color: "#999" }}> · {l.detail}</span>}
            </span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: "#F2F2F2" }}>
            <div className="h-1.5 rounded-full" style={{ width: `${(l.valeur / max) * 100}%`, background: VERT }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function PageAdminAudience({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const jours = PERIODES.includes(Number(sp.jours) as (typeof PERIODES)[number]) ? Number(sp.jours) : 30;
  const depuis = debutPeriode(jours);

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("stats_audience", { p_depuis: depuis });
  const stats = data as Stats | null;

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-wrap items-end gap-4 justify-between">
        <div>
          <h1 className="text-2xl mb-1" style={{ fontFamily: "var(--font-marcellus), serif", color: VERT }}>
            Audience du site
          </h1>
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            Mesure interne sans cookie : tous les visiteurs, qu&apos;ils aient accepté le bandeau ou non.
          </p>
        </div>

        <div className="flex gap-2">
          {PERIODES.map((p) => (
            <Link
              key={p}
              href={`/admin/audience?jours=${p}`}
              className="text-xs font-semibold px-3.5 py-2 rounded-lg"
              style={{
                background: p === jours ? VERT : "#fff",
                color: p === jours ? "#fff" : VERT,
                border: "1px solid #EBEBEB",
                textDecoration: "none",
              }}
            >
              {p} jours
            </Link>
          ))}
        </div>
      </div>

      {error || !stats ? (
        <div className="rounded-xl p-5 text-sm" style={{ background: "#FFF8E6", border: `1px solid ${OR}`, color: "#6B5300" }}>
          Les statistiques ne sont pas encore disponibles. Si ce n&apos;est pas déjà fait, exécutez le script{" "}
          <code>mesure_audience.sql</code> dans Supabase (SQL Editor), puis ouvrez quelques pages du site.
          {error && <span className="block mt-2 opacity-70">Détail : {error.message}</span>}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Chiffres clés */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Chiffre valeur={stats.visites.toLocaleString("fr-MA")} libelle={`Visites sur ${jours} jours`} />
            <Chiffre valeur={stats.pages.toLocaleString("fr-MA")} libelle="Pages vues" />
            <Chiffre
              valeur={stats.visites ? (stats.pages / stats.visites).toLocaleString("fr-MA", { maximumFractionDigits: 1 }) : "—"}
              libelle="Pages vues par visite"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Carte titre="D'où viennent les visiteurs">
              <Barres lignes={stats.par_source.map((s) => ({ libelle: libelleSource(s.source), valeur: s.visites }))} />
            </Carte>

            <Carte titre="Biens les plus consultés">
              <Barres
                lignes={stats.top_biens.map((b) => ({
                  libelle: b.reference_bien,
                  valeur: b.vues,
                  detail: b.vues_meta ? `${b.vues_meta} via Facebook/Instagram` : undefined,
                }))}
              />
            </Carte>

            <Carte titre="Visites par jour">
              <Barres
                lignes={[...stats.par_jour].reverse().map((j) => ({
                  libelle: formatJour(j.jour),
                  valeur: j.visites,
                  detail: `${j.pages} pages`,
                }))}
              />
            </Carte>

            <div className="space-y-5">
              <Carte titre="Pages les plus vues">
                <Barres lignes={stats.top_pages.map((p) => ({ libelle: p.chemin, valeur: p.vues }))} />
              </Carte>

              <Carte titre="Appareils">
                <Barres
                  lignes={stats.par_appareil.map((a) => ({
                    libelle: a.appareil === "mobile" ? "Mobile" : "Ordinateur",
                    valeur: a.visites,
                  }))}
                />
              </Carte>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
