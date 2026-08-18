import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import BadgeStatut from "@/components/compte/BadgeStatut";
import PhotoGalerie from "@/components/ui/PhotoGalerie";
import DocumentsProprietaire from "@/components/compte/DocumentsProprietaire";
import { urlsPhotosNettes } from "@/lib/images/photosBien";
import { formaterPrix } from "@/lib/format";
import { documentsParType } from "@/lib/documents/fiche";
import { formatPhoneMaroc } from "@/lib/utils/telephone";

// Fiche bien côté PROPRIÉTAIRE — lecture seule stricte : aucune donnée du bien
// n'est modifiable ici (prix, infos…). Seule action possible : déposer ses
// pièces justificatives (CIN, certificat de propriété), en option.
// Toutes les requêtes passent par le client SSR authentifié → RLS appliquée
// (le propriétaire ne voit que SES biens et SES documents cin/certificat).

export const metadata: Metadata = {
  title: "Mon bien",
};

type Props = { params: Promise<{ id: string }> };

function formaterDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function PageFicheBienProprietaire({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=/mon-compte/mes-biens/${id}`);

  const { data: bienRaw } = await supabase
    .from("biens")
    .select(
      "id, reference, slug, titre, description, type, transaction, prix, ville, quartier, " +
      "chambres, salles_bain, surface, photos, photos_originales, statut, verifie, " +
      "proprietaire_id, agent_id, date_soumission"
    )
    .eq("id", id)
    .maybeSingle();

  if (!bienRaw) notFound();

  const bien = bienRaw as unknown as {
    id: string; reference: string | null; slug: string | null; titre: string;
    description: string | null; type: string; transaction: string; prix: number;
    ville: string; quartier: string | null; chambres: number; salles_bain: number;
    surface: number; photos: string[] | null; photos_originales: string[] | null;
    statut: string | null; verifie: boolean; date_soumission: string | null;
    proprietaire_id: string | null; agent_id: string | null;
  };

  // Garde de propriété : uniquement SES biens (en plus de la RLS)
  if (bien.proprietaire_id !== user.id) notFound();

  // ── Conseiller en charge du bien (affiché si affecté) ─────────────────────
  let agent: { nom: string; telephone: string | null; email: string | null; avatar_url: string | null } | null = null;
  if (bien.agent_id) {
    const { data: profilAgent } = await supabase
      .from("profils")
      .select("nom_complet, telephone, email_contact, avatar_url")
      .eq("id", bien.agent_id)
      .maybeSingle();
    if (profilAgent) {
      agent = {
        nom: profilAgent.nom_complet ?? "Conseiller HOOMY",
        telephone: profilAgent.telephone ?? null,
        email: profilAgent.email_contact ?? null,
        avatar_url: profilAgent.avatar_url ?? null,
      };
    }
  }

  // Photos nettes (le propriétaire voit toujours les siennes — URL signées)
  const photos = await urlsPhotosNettes(
    Array.isArray(bien.photos) ? bien.photos : [],
    Array.isArray(bien.photos_originales) ? bien.photos_originales : [],
    bien.verifie
  );

  // Documents visibles par le propriétaire (la RLS limite à cin + certificat)
  const documents = (await documentsParType(supabase, bien.id)).filter((d) =>
    ["cin", "certificat_propriete"].includes(d.type_document)
  );

  const estPublie = bien.statut === "finalise" || bien.statut === "transacte";
  const lienAnnonce = estPublie && bien.slug
    ? `/${bien.transaction === "location" ? "louer" : "acheter"}/${bien.slug}`
    : null;

  return (
    <div className="max-w-3xl mx-auto">

      {/* ── Fil de retour ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/mon-compte/mes-biens"
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
          {bien.reference ?? "Détail"}
        </span>
      </div>

      {/* ── En-tête (lecture seule) ────────────────────────────────────────── */}
      <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1
            className="text-xl font-normal mb-1"
            style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}
          >
            {bien.titre}
          </h1>
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            {bien.type} · {bien.ville}{bien.quartier ? ` · ${bien.quartier}` : ""}
            {bien.reference && (
              <span className="ml-2 font-mono text-xs" style={{ color: "#C4D8CE" }}>{bien.reference}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <BadgeStatut statut={bien.statut} />
          {lienAnnonce && (
            <Link
              href={lienAnnonce}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl hover:opacity-90 transition-opacity"
              style={{ background: "#D4AF37", color: "#0F4C3A", textDecoration: "none" }}
            >
              Voir l&apos;annonce
            </Link>
          )}
        </div>
      </div>

      {/* ── Photos ─────────────────────────────────────────────────────────── */}
      {photos.length > 0 && (
        <div className="mb-5">
          <PhotoGalerie photos={photos} hauteur={150} largeurMax={230} classeImage="rounded-2xl" />
        </div>
      )}

      {/* ── Prix + caractéristiques (affichage seul) ───────────────────────── */}
      <div
        className="rounded-2xl px-5 py-4 mb-6 flex flex-wrap items-center gap-x-6 gap-y-2"
        style={{ background: "#fff", border: "1px solid #F0EDE5" }}
      >
        <p className="leading-none" style={{ fontFamily: "var(--font-marcellus),serif", color: "#D4AF37", fontSize: "1.5rem" }}>
          {formaterPrix(bien.prix, bien.transaction)}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm" style={{ color: "#3D4A42" }}>
          {bien.surface > 0 && <span>📐 {bien.surface} m²</span>}
          {bien.chambres > 0 && <span>🛏️ {bien.chambres} ch.</span>}
          {bien.salles_bain > 0 && <span>🚿 {bien.salles_bain} sdb</span>}
        </div>
        <span className="text-xs ml-auto" style={{ color: "#C4D8CE" }}>
          Soumis le {formaterDate(bien.date_soumission)}
        </span>
      </div>

      {/* ── Votre conseiller HOOMY (agent en charge du bien) ───────────────── */}
      {agent && (() => {
        const telAgent = formatPhoneMaroc(agent.telephone);
        const initiales = agent.nom.split(/\s+/).map((m) => m[0]).slice(0, 2).join("").toUpperCase();
        return (
          <section
            className="rounded-2xl px-5 py-4 mb-6"
            style={{ background: "#F0FAF4", border: "1px solid #C6E8D4" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#146C43" }}>
              Votre conseiller HOOMY
            </p>
            <div className="flex flex-wrap items-center gap-4">
              {/* Avatar ou initiales */}
              {agent.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={agent.avatar_url}
                  alt={agent.nom}
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  style={{ border: "2px solid #D4AF37" }}
                />
              ) : (
                <span
                  className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: "#0F4C3A", color: "#D4AF37" }}
                >
                  {initiales}
                </span>
              )}

              {/* Identité + coordonnées */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: "#0F4C3A" }}>{agent.nom}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-0.5 text-xs" style={{ color: "#3D4A42" }}>
                  {telAgent.affichage && (
                    <a href={`tel:${telAgent.lienTel}`} className="hover:underline tabular-nums" style={{ color: "#0F4C3A", textDecoration: "none" }}>
                      📞 {telAgent.affichage}
                    </a>
                  )}
                  {agent.email && (
                    <a href={`mailto:${agent.email}`} className="hover:underline truncate" style={{ color: "#0F4C3A", textDecoration: "none" }}>
                      ✉️ {agent.email}
                    </a>
                  )}
                </div>
              </div>

              {/* Actions rapides */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {telAgent.lienTel && (
                  <a
                    href={`tel:${telAgent.lienTel}`}
                    className="text-xs font-semibold px-3 py-2 rounded-xl hover:opacity-90 transition-opacity"
                    style={{ background: "#0F4C3A", color: "#fff", textDecoration: "none" }}
                  >
                    Appeler
                  </a>
                )}
                {telAgent.numeroWA && (
                  <a
                    href={`https://wa.me/${telAgent.numeroWA}?text=${encodeURIComponent(`Bonjour ${agent.nom}, je vous contacte au sujet de mon bien ${bien.reference ?? bien.titre} sur HOOMY.MA.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold px-3 py-2 rounded-xl hover:opacity-90 transition-opacity"
                    style={{ background: "#25D366", color: "#fff", textDecoration: "none" }}
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          </section>
        );
      })()}

      {/* ── Vos pièces justificatives ──────────────────────────────────────── */}
      <section className="mb-6">
        <h2
          className="text-base font-semibold mb-2"
          style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}
        >
          Vos pièces justificatives
        </h2>
        <p className="text-sm leading-relaxed mb-4" style={{ color: "#6B7A71" }}>
          Pour valider votre bien et vous protéger, nous vérifions que vous en êtes bien le
          propriétaire. Ajoutez votre CIN et votre certificat de propriété — ces documents
          restent confidentiels et ne sont visibles que par votre conseiller HOOMY.
        </p>
        <DocumentsProprietaire bienId={bien.id} documents={documents} />
      </section>

      {/* ── Description (lecture seule) ────────────────────────────────────── */}
      {bien.description && (
        <section className="mb-6">
          <h2 className="text-base font-semibold mb-2" style={{ color: "#0F4C3A" }}>Description</h2>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#3D4A42" }}>
            {bien.description}
          </p>
        </section>
      )}

      {/* Note lecture seule */}
      <p className="text-xs mb-8" style={{ color: "#C4D8CE" }}>
        Pour modifier les informations de ce bien (prix, description…), contactez votre conseiller HOOMY.
      </p>
    </div>
  );
}
