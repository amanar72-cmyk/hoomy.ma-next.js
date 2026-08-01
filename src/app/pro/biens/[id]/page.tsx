import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import FormulaireEditionBienAgent, { type BienEditable } from "@/components/pro/FormulaireEditionBienAgent";
import PhotoGalerie from "@/components/ui/PhotoGalerie";
import DocumentsFiche from "@/components/pro/DocumentsFiche";
import OngletsFiche from "@/components/partage/OngletsFiche";
import FicheInfosBien, { type BienFiche } from "@/components/partage/FicheInfosBien";
import CarteContactProfil, { type ProfilContact } from "@/components/partage/CarteContactProfil";
import CarteLocalisationBO from "@/components/partage/CarteLocalisationBO";
import ListeDemandesVisite, { type DemandeVisiteFiche } from "@/components/partage/ListeDemandesVisite";
import { urlsPhotosNettes } from "@/lib/images/photosBien";
import { formaterPrix } from "@/lib/format";
import { documentsParType, TYPES_DOCUMENTS_FICHE, MESSAGE_DOCUMENTS_MANQUANTS } from "@/lib/documents/fiche";
import { infoStatut } from "@/lib/biens/statuts";
import VendeurEtAcheteursBien from "@/components/proprietaires/VendeurEtAcheteursBien";

export const metadata: Metadata = {
  title: "Fiche bien — Espace Pro HOOMY.MA",
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ modifier?: string; onglet?: string }>;
};

const STATUTS_MODIFIABLES = ["brouillon", "affecte"];

export default async function PageFicheBienAgent({ params, searchParams }: Props) {
  const { id } = await params;
  const { modifier, onglet } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  // select("*") : récupère aussi proprietaire_id, dates du cycle de vie,
  // charges, nombre_vues et date_publication (colonne récente).
  const { data: bienRaw, error } = await supabase
    .from("biens")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !bienRaw) notFound();

  const bien = bienRaw as unknown as BienEditable & BienFiche & {
    id: string;
    agent_id: string | null;
    proprietaire_id: string | null;
    slug: string | null;
    verifie: boolean;
    latitude: number | null;
    longitude: number | null;
    photos: unknown;
    photos_originales: unknown;
  };

  // Vérification propriété — seul l'agent affecté peut voir la fiche
  if (bien.agent_id !== user.id) {
    redirect("/pro/biens");
  }

  const estModifiable = STATUTS_MODIFIABLES.includes(bien.statut ?? "");
  const modeEdition = modifier === "1" && estModifiable;

  // ── Documents du dossier (mandat, CIN, certificat) ─────────────────────────
  const documents = await documentsParType(supabase, bien.id);
  const typesPresents = new Set(documents.map((d) => d.type_document));
  const dossierEstComplet = TYPES_DOCUMENTS_FICHE.every((t) => typesPresents.has(t));
  const nbDocs = TYPES_DOCUMENTS_FICHE.filter((t) => typesPresents.has(t)).length;

  // ── Mode édition — logique existante inchangée ──────────────────────────────
  if (modeEdition) {
    // Conseiller traitant = l'agent connecté (son propre profil).
    const { data: conseillerEdit } = await supabase
      .from("profils")
      .select("nom_complet, email, telephone, role")
      .eq("id", user.id)
      .single();
    return (
      <div className="p-6 lg:p-10 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href={`/pro/biens/${id}`}
            className="text-sm flex items-center gap-1 hover:opacity-80 transition-opacity"
            style={{ color: "#9DB8AD", textDecoration: "none" }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Consultation
          </Link>
          <span style={{ color: "#E0DAC8" }}>/</span>
          <span className="text-sm" style={{ color: "#0F4C3A" }}>Modification</span>
        </div>

        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl mb-1"
              style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}>
              Modifier le bien
            </h1>
            <p className="text-sm" style={{ color: "#9DB8AD" }}>{bien.titre}</p>
          </div>
          {bien.reference && (
            <span className="text-xs px-3 py-1 rounded-full font-mono mt-1 flex-shrink-0"
              style={{ background: "#E8F5ED", color: "#0F4C3A", border: "1px solid #C6E8D4" }}>
              {bien.reference}
            </span>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 items-start">
          {/* Colonne principale : formulaire + documents */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            <FormulaireEditionBienAgent bien={bien} agentId={user.id} documentsComplets={dossierEstComplet} />

            {/* Documents du dossier — accessibles aussi en mode édition */}
            <section>
              <h2 className="text-base font-semibold mb-3" style={{ color: "#0F4C3A" }}>
                Documents du dossier
              </h2>
              <DocumentsFiche bienId={bien.id} documents={documents} />
            </section>
          </div>

          {/* Panneau de droite : Propriétaire (en premier) puis Conseiller traitant */}
          <div className="flex flex-col gap-4">
            <VendeurEtAcheteursBien
              base="/pro"
              bienId={bien.id}
              vendeurId={(bien as { vendeur_id?: string | null }).vendeur_id ?? null}
            />
            <CarteContactProfil
              titre="Conseiller traitant"
              profil={conseillerEdit as ProfilContact | null}
              vide="Profil conseiller introuvable."
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Mode lecture ───────────────────────────────────────────────────────────

  // Propriétaire : la RLS de profils ne permet à l'agent de lire que son propre
  // profil — lecture via le client admin APRÈS la vérification de propriété
  // ci-dessus (même pattern que modifierBienAgent dans ./actions.ts).
  let proprietaire: ProfilContact | null = null;
  if (bien.proprietaire_id) {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from("profils")
      .select("nom_complet, email, telephone, role")
      .eq("id", bien.proprietaire_id)
      .single();
    proprietaire = (data as ProfilContact | null) ?? null;
  }

  // Conseiller = l'agent connecté (son propre profil, lisible via RLS)
  const { data: conseillerRaw } = await supabase
    .from("profils")
    .select("nom_complet, email, telephone, role")
    .eq("id", user.id)
    .single();
  const conseiller = (conseillerRaw as ProfilContact | null) ?? null;

  // Demandes de visite du bien (RLS : l'agent voit celles de ses biens)
  const { data: demandesRaw } = await supabase
    .from("demandes_visite")
    .select("id, nom_client, email_client, telephone_client, date_souhaitee, date_confirmee, message, statut, cree_le")
    .eq("bien_id", bien.id)
    .order("cree_le", { ascending: false });
  const demandes = (demandesRaw ?? []) as DemandeVisiteFiche[];

  // Photos nettes (URL signées tant que le bien n'est pas validé)
  const photosBrutes = Array.isArray(bien.photos) ? (bien.photos as string[]) : [];
  const photos = await urlsPhotosNettes(
    photosBrutes,
    Array.isArray(bien.photos_originales) ? (bien.photos_originales as string[]) : [],
    bien.verifie
  );

  const estPublie = bien.statut === "finalise" || bien.statut === "transacte";
  const lienAnnonce = estPublie && bien.slug
    ? `/${bien.transaction === "location" ? "louer" : "acheter"}/${bien.slug}`
    : null;
  const statutInfo = infoStatut(bien.statut);

  const ongletActif = ["fiche", "photos", "documents", "demandes"].includes(onglet ?? "")
    ? (onglet as string)
    : "fiche";
  const onglets = [
    { id: "fiche", label: "Fiche du bien" },
    { id: "photos", label: "Photos", badge: photos.length },
    { id: "documents", label: "Documents", badge: `${nbDocs}/${TYPES_DOCUMENTS_FICHE.length}` },
    { id: "demandes", label: "Demandes de visite", badge: demandes.length },
  ];

  function formaterDate(d: string | null | undefined) {
    if (!d) return null;
    return new Date(d).toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">

      {/* Fil d'Ariane */}
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

      {/* En-tête */}
      <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl mb-1"
            style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}>
            {bien.type} {bien.transaction === "location" ? "à louer" : "à vendre"} — {bien.titre}
          </h1>
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            {bien.ville}{bien.quartier ? ` · ${bien.quartier}` : ""}
            {" · "}Créé le {formaterDate(bien.cree_le)}
            {bien.date_publication ? ` · Publié le ${formaterDate(bien.date_publication)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
          {bien.reference && (
            <span className="text-xs px-3 py-1 rounded-full font-mono"
              style={{ background: "#E8F5ED", color: "#0F4C3A", border: "1px solid #C6E8D4" }}>
              {bien.reference}
            </span>
          )}
          {lienAnnonce && (
            <Link
              href={lienAnnonce}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl hover:opacity-90 transition-opacity"
              style={{ background: "#D4AF37", color: "#0F4C3A", textDecoration: "none" }}
            >
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Voir l&apos;annonce
            </Link>
          )}
          {estModifiable && (
            <Link
              href={`/pro/biens/${id}?modifier=1`}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
              style={{ background: "#0F4C3A", color: "#fff", textDecoration: "none" }}
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Modifier
            </Link>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{ background: statutInfo.bg, color: statutInfo.color }}>
          {statutInfo.label}
        </span>
        {bien.verifie && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ background: "#D1FAE5", color: "#065F46" }}>
            ✅ Vérifié HOOMY
          </span>
        )}
      </div>

      {/* Notice si statut non modifiable */}
      {!estModifiable && (
        <div className="mb-4 rounded-xl px-4 py-3 flex items-start gap-2 text-sm"
          style={{ background: "#F0FAF4", border: "1px solid #C6E8D4", color: "#0F4C3A" }}>
          <span className="flex-shrink-0 mt-0.5">ℹ️</span>
          <span>
            Ce bien ne peut plus être modifié directement — il est <strong>{statutInfo.label.toLowerCase()}</strong>.
            Contactez le back-office si une correction est nécessaire.
          </span>
        </div>
      )}

      {/* Prix */}
      <p className="mb-5 leading-none"
        style={{
          fontFamily: "var(--font-marcellus), serif",
          color: "#D4AF37",
          fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
        }}>
        {formaterPrix(bien.prix, bien.transaction)}
      </p>

      {/* Onglets */}
      <OngletsFiche onglets={onglets} actif={ongletActif} hrefBase={`/pro/biens/${id}`} />

      {/* Contenu : onglet actif + colonne latérale */}
      <div className="grid lg:grid-cols-3 gap-6 items-start">

        {/* ── Colonne principale ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {ongletActif === "fiche" && (
            <>
              <FicheInfosBien bien={bien} />
              <section>
                <h2 className="text-base font-semibold mb-3" style={{ color: "#0F4C3A" }}>
                  Localisation
                </h2>
                <CarteLocalisationBO
                  latitude={bien.latitude}
                  longitude={bien.longitude}
                  titre={bien.titre}
                  bienId={bien.id}
                />
                <p className="text-sm mt-2" style={{ color: "#6B7A71" }}>
                  {bien.quartier ? `${bien.quartier}, ` : ""}{bien.ville}
                </p>
              </section>
            </>
          )}

          {ongletActif === "photos" && (
            photos.length > 0 ? (
              <PhotoGalerie photos={photos} hauteur={220} largeurMax={320} classeImage="rounded-2xl" />
            ) : (
              <div className="rounded-2xl py-10 text-center text-sm"
                style={{ background: "#FAFAF8", border: "1px dashed #E8E2D2", color: "#9DB8AD" }}>
                Aucune photo pour ce bien
              </div>
            )
          )}

          {ongletActif === "documents" && (
            <section>
              {!dossierEstComplet && estModifiable && (
                <div className="mb-3 rounded-xl px-4 py-3 flex items-start gap-2 text-sm"
                  style={{ background: "#FEF9EC", border: "1px solid #F3E0A8", color: "#92400E" }}>
                  <span className="flex-shrink-0 mt-0.5">📁</span>
                  <span>{MESSAGE_DOCUMENTS_MANQUANTS}</span>
                </div>
              )}
              <DocumentsFiche bienId={bien.id} documents={documents} />
            </section>
          )}

          {ongletActif === "demandes" && <ListeDemandesVisite demandes={demandes} />}
        </div>

        {/* ── Colonne latérale : contacts ────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Vendeur (répertoire proprietaires) + acheteurs (leads du bien) */}
          <VendeurEtAcheteursBien
            base="/pro"
            bienId={bien.id}
            vendeurId={(bien as { vendeur_id?: string | null }).vendeur_id ?? null}
          />

          {/* Compte utilisateur du site (proprietaire_id) — distinct du
              répertoire vendeurs : c'est la personne qui a soumis via /publier */}
          <CarteContactProfil
            titre="Compte client (site)"
            profil={proprietaire}
            vide="Aucun compte client — bien créé en interne."
          />
          <CarteContactProfil
            titre="Conseiller HOOMY"
            profil={conseiller}
            vide="Profil conseiller introuvable."
          />
        </div>
      </div>
    </div>
  );
}
