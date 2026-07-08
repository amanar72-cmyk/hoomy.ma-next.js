import { createAdminClient } from "@/lib/supabase/admin";
import TableauAdmin from "@/components/admin/TableauAdmin";
import Pagination from "@/components/pro/Pagination";
import { parseUserAgent } from "@/lib/securite/parseUserAgent";
import Link from "next/link";

// Logs des tentatives de connexion (succès + échecs) avec IP + appareil.
// Lecture via service_role : la table est fermée en RLS à tout le reste.
// Page servie derrière la garde admin du layout /admin.

export const dynamic = "force-dynamic";

const PAR_PAGE = 30;

type Tentative = {
  id: string;
  cree_le: string;
  email: string | null;
  methode: string;
  resultat: string;
  motif: string | null;
  adresse_ip: string | null;
  user_agent: string | null;
};

const LABEL_METHODE: Record<string, string> = {
  mot_de_passe: "Mot de passe",
  google: "Google",
  pro: "Espace pro",
};

type SearchParams = Promise<{ page?: string; r?: string; q?: string }>;

export default async function PageAdminLogs({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const filtre = sp.r === "succes" || sp.r === "echec" ? sp.r : null;
  const recherche = sp.q?.trim() ?? "";

  const supabase = createAdminClient();
  let query = supabase
    .from("tentatives_connexion")
    .select("id, cree_le, email, methode, resultat, motif, adresse_ip, user_agent", { count: "exact" })
    .order("cree_le", { ascending: false });

  if (filtre) query = query.eq("resultat", filtre);
  if (recherche) query = query.or(`email.ilike.%${recherche}%,adresse_ip.ilike.%${recherche}%`);

  const from = (page - 1) * PAR_PAGE;
  const { data, count } = await query.range(from, from + PAR_PAGE - 1);
  const tentatives = (data ?? []) as Tentative[];
  const total = count ?? 0;

  // Comptes globaux (indépendants de la page) pour l'en-tête
  const [{ count: totalEchecs }, { count: totalSucces }] = await Promise.all([
    supabase.from("tentatives_connexion").select("id", { count: "exact", head: true }).eq("resultat", "echec"),
    supabase.from("tentatives_connexion").select("id", { count: "exact", head: true }).eq("resultat", "succes"),
  ]);

  // baseUrl qui conserve les filtres actifs pour la pagination
  const params = new URLSearchParams();
  if (filtre) params.set("r", filtre);
  if (recherche) params.set("q", recherche);
  const baseUrl = `/admin/logs${params.toString() ? `?${params.toString()}` : ""}`;

  const FILTRES: { cle: string | null; label: string; href: string }[] = [
    { cle: null, label: "Toutes", href: rechercheHref(null, recherche) },
    { cle: "succes", label: `Réussies (${totalSucces ?? 0})`, href: rechercheHref("succes", recherche) },
    { cle: "echec", label: `Échouées (${totalEchecs ?? 0})`, href: rechercheHref("echec", recherche) },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl mb-1" style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}>
          Logs &amp; sécurité
        </h1>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>
          {total} tentative{total > 1 ? "s" : ""} de connexion{filtre ? " (filtrées)" : ""}
        </p>
      </div>

      {/* Filtres + recherche */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {FILTRES.map((f) => {
          const actif = (f.cle ?? null) === filtre;
          return (
            <Link
              key={f.label}
              href={f.href}
              className="text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors"
              style={{
                background: actif ? "#0F4C3A" : "#fff",
                color: actif ? "#fff" : "#0F4C3A",
                border: "1px solid #EBEBEB",
                textDecoration: "none",
              }}
            >
              {f.label}
            </Link>
          );
        })}
        <form action="/admin/logs" className="ml-auto flex items-center gap-2">
          {filtre && <input type="hidden" name="r" value={filtre} />}
          <input
            type="text"
            name="q"
            defaultValue={recherche}
            placeholder="Rechercher email ou IP…"
            className="text-sm px-3.5 py-2 rounded-lg outline-none"
            style={{ border: "1px solid #EBEBEB", background: "#fff", minWidth: 220 }}
          />
        </form>
      </div>

      <TableauAdmin
        colonnes={["Date", "Email", "Méthode", "Résultat", "IP", "Appareil", "Motif"]}
        estVide={tentatives.length === 0}
        vide="Aucune tentative de connexion enregistrée"
      >
        {tentatives.map((t) => {
          const { navigateur, os } = parseUserAgent(t.user_agent);
          const succes = t.resultat === "succes";
          return (
            <tr key={t.id} style={{ borderBottom: "1px solid #F2F2F2" }}>
              <td className="px-4 py-3 whitespace-nowrap" style={{ color: "#666" }}>
                {new Date(t.cree_le).toLocaleString("fr-MA", {
                  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </td>
              <td className="px-4 py-3" style={{ color: "#111" }}>{t.email ?? "—"}</td>
              <td className="px-4 py-3 whitespace-nowrap" style={{ color: "#666" }}>
                {LABEL_METHODE[t.methode] ?? t.methode}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span
                  className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    background: succes ? "rgba(20,108,67,0.1)" : "rgba(200,50,50,0.1)",
                    color: succes ? "#146C43" : "#C33",
                  }}
                >
                  {succes ? "Réussie" : "Échouée"}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap tabular-nums" style={{ color: "#666" }}>{t.adresse_ip ?? "—"}</td>
              <td className="px-4 py-3 whitespace-nowrap" style={{ color: "#666" }}>
                {navigateur} · {os}
              </td>
              <td className="px-4 py-3" style={{ color: "#999", maxWidth: 220 }}>
                <span className="block truncate">{t.motif ?? "—"}</span>
              </td>
            </tr>
          );
        })}
      </TableauAdmin>

      <Pagination page={page} total={total} parPage={PAR_PAGE} baseUrl={baseUrl} />
    </div>
  );
}

function rechercheHref(r: string | null, q: string): string {
  const p = new URLSearchParams();
  if (r) p.set("r", r);
  if (q) p.set("q", q);
  const qs = p.toString();
  return `/admin/logs${qs ? `?${qs}` : ""}`;
}
