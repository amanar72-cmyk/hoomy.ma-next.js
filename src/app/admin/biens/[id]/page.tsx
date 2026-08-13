import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import FormulaireEditionBien from "@/components/admin/FormulaireEditionBien";
import { affecterBienAgent } from "@/app/admin/actions";
import PhotoGalerie from "@/components/ui/PhotoGalerie";
import OngletsFiche from "@/components/partage/OngletsFiche";
import FicheInfosBien, { type BienFiche } from "@/components/partage/FicheInfosBien";
import CarteContactProfil, { type ProfilContact } from "@/components/partage/CarteContactProfil";
import CarteLocalisationBO from "@/components/partage/CarteLocalisationBO";
import ListeDemandesVisite, { type DemandeVisiteFiche } from "@/components/partage/ListeDemandesVisite";
import DocumentsFiche from "@/components/pro/DocumentsFiche";
import { urlsPhotosNettes } from "@/lib/images/photosBien";
import { formaterPrix } from "@/lib/format";
import { documentsParType, TYPES_DOCUMENTS_FICHE } from "@/lib/documents/fiche";
import { infoStatut } from "@/lib/biens/statuts";
import { peutEtreVisualise, urlPubliqueBien } from "@/lib/biens/lienPublic";
import BoutonVisualiserBien from "@/components/partage/BoutonVisualiserBien";
import VendeurEtAcheteursBien from "@/components/proprietaires/VendeurEtAcheteursBien";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ modifier?: string; onglet?: string }>;
};

function formaterDate(d: string | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function PageFicheBien({ params, searchParams }: Props) {
  const { id } = await params;
  const { modifier, onglet } = await searchParams;
  const supabase = await createClient();

  const { data: bienRaw, error } = await supabase
    .from("biens")
    .select("*")
    .eq("id", id)
    .single();

  if (!bienRaw) {
    if (error) console.error(`[admin/biens/${id}]`, error.message);
    notFound();
  }

  const bien = bienRaw as unknown as BienFiche & {
    id: string;
    titre: string;
    statut: string | null;
    verifie: boolean;
    slug: string | null;
    agent_id: string | null;
    proprietaire_id: string | null;
    latitude: number | null;
    longitude: number | null;
    photos: unknown;
    photos_originales: unknown;
  };

  const modeEdition = modifier === "1";

  // Documents du dossier — nécessaires en édition (dépôt admin) ET en lecture.
  const documents = await documentsParType(supabase, bien.id);

  // ── Mode édition — logique existante inchangée ──────────────────────────────
  if (modeEdition) {
    // Conseiller traitant (agent affecté) — pour le panneau de droite.
    const { data: conseillerEdit } = bien.agent_id
      ? await supabase.from("profils").select("nom_complet, email, telephone, role").eq("id", bien.agent_id).single()
      : { data: null };
    return (
      <div className="p-6 lg:p-10 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href={`/admin/biens/${id}`}
            className="text-sm flex items-center gap-1 hover:opacity-70 transition-opacity"
            style={{ color: "#999", textDecoration: "none" }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Consultation
          </Link>
          <span style={{ color: "#DDD" }}>/</span>
          <span className="text-sm font-medium" style={{ color: "#111" }}>Modification</span>
        </div>

        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold mb-0.5" style={{ color: "#111" }}>
              Modifier le bien
            </h1>
            <p className="text-sm" style={{ color: "#999" }}>{bien.titre}</p>
          </div>
          {bien.reference && (
            <span className="text-xs px-3 py-1 rounded-full font-mono mt-1 flex-shrink-0"
              style={{ background: "#F5F5F5", color: "#777", border: "1px solid #E8E8E8" }}>
              {bien.reference}
            </span>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 items-start">
          {/* Colonne principale : formulaire à onglets (Informations / Photos / Documents) */}
          <div className="lg:col-span-2">
            <FormulaireEditionBien
              bien={bienRaw}
              documentsSlot={
                <section>
                  <h2 className="text-base font-semibold mb-3" style={{ color: "#0F4C3A" }}>
                    Documents du dossier
                  </h2>
                  <DocumentsFiche bienId={bien.id} documents={documents} role="admin" />
                </section>
              }
            />
          </div>

          {/* Panneau de droite : Propriétaire (en premier) puis Conseiller traitant */}
          <div className="flex flex-col gap-4">
            <VendeurEtAcheteursBien
              base="/admin"
              bienId={bien.id}
              vendeurId={(bien as { vendeur_id?: string | null }).vendeur_id ?? null}
            />
            <CarteContactProfil
              titre="Conseiller traitant"
              profil={conseillerEdit as ProfilContact | null}
              vide="Aucun conseiller affecté."
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Données du mode lecture ─────────────────────────────────────────────────
  // documents déjà chargé plus haut (partagé avec le mode édition).
  const [photos, demandesRes, agentsRes, proprietaireRes] = await Promise.all([
    urlsPhotosNettes(
      Array.isArray(bien.photos) ? (bien.photos as string[]) : [],
      Array.isArray(bien.photos_originales) ? (bien.photos_originales as string[]) : [],
      bien.verifie
    ),
    supabase
      .from("demandes_visite")
      .select("id, nom_client, email_client, telephone_client, date_souhaitee, date_confirmee, message, statut, cree_le")
      .eq("bien_id", bien.id)
      .order("cree_le", { ascending: false }),
    supabase
      .from("profils")
      .select("id, nom_complet, email, telephone, role")
      .in("role", ["agent", "agence"])
      .order("nom_complet"),
    bien.proprietaire_id
      ? supabase
          .from("profils")
          .select("nom_complet, email, telephone, role")
          .eq("id", bien.proprietaire_id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const demandes = (demandesRes.data ?? []) as DemandeVisiteFiche[];
  const agents = (agentsRes.data ?? []) as Array<
    ProfilContact & { id: string; nom_complet: string }
  >;
  const proprietaire = (proprietaireRes.data as ProfilContact | null) ?? null;
  const conseiller = agents.find((a) => a.id === bien.agent_id) ?? null;

  const typesPresents = new Set(documents.map((d) => d.type_document));
  const nbDocs = TYPES_DOCUMENTS_FICHE.filter((t) => typesPresents.has(t)).length;
  const statutInfo = infoStatut(bien.statut);

  // URL ABSOLUE : un chemin relatif resterait sur pro.hoomy.ma, où le
  // middleware le renvoie vers l'accueil admin (voir lib/biens/lienPublic.ts).
  const estPublie = peutEtreVisualise(bien.statut);
  const lienAnnonce = urlPubliqueBien(bien);

  const ongletActif = ["fiche", "photos", "documents", "demandes"].includes(onglet ?? "")
    ? (onglet as string)
    : "fiche";
  const onglets = [
    { id: "fiche", label: "Fiche du bien" },
    { id: "photos", label: "Photos", badge: photos.length },
    { id: "documents", label: "Documents", badge: `${nbDocs}/${TYPES_DOCUMENTS_FICHE.length}` },
    { id: "demandes", label: "Demandes de visite", badge: demandes.length },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">

      {/* Fil d'Ariane */}
      <div className="flex items-center gap-3 mb-2">
        <Link
          href="/admin/biens"
          className="text-sm flex items-center gap-1 hover:opacity-80 transition-opacity"
          style={{ color: "#9DB8AD", textDecoration: "none" }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Biens
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
        <div className="flex items-center gap-2.5 flex-shrink-0 flex-wrap">
          {bien.reference && (
            <span className="text-xs px-3 py-1 rounded-full font-mono"
              style={{ background: "#E8F5ED", color: "#0F4C3A", border: "1px solid #C6E8D4" }}>
              {bien.reference}
            </span>
          )}
          <BoutonVisualiserBien href={lienAnnonce} actif={estPublie} statut={bien.statut} />
          <Link
            href={`/admin/biens/${id}?modifier=1`}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
            style={{ background: "#0F4C3A", color: "#fff", textDecoration: "none" }}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Modifier
          </Link>
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
            ✓ Vérifié
          </span>
        )}
      </div>

      {/* Prix */}
      <p className="mb-5 leading-none"
        style={{
          fontFamily: "var(--font-marcellus), serif",
          color: "#D4AF37",
          fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
        }}>
        {formaterPrix(bien.prix, bien.transaction)}
      </p>

      {/* Onglets */}
      <OngletsFiche onglets={onglets} actif={ongletActif} hrefBase={`/admin/biens/${id}`} />

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
              <DocumentsFiche bienId={bien.id} documents={documents} role="admin" />
              <p className="text-xs mt-3" style={{ color: "#9DB8AD" }}>
                La validation finale des documents se fait dans{" "}
                <Link href="/admin/verifications" className="underline" style={{ color: "#0F4C3A" }}>
                  Vérifications
                </Link>.
              </p>
            </section>
          )}

          {ongletActif === "demandes" && <ListeDemandesVisite demandes={demandes} />}
        </div>

        {/* ── Colonne latérale : contacts + affectation ──────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Vendeur (répertoire proprietaires) + acheteurs (leads du bien) */}
          <VendeurEtAcheteursBien
            base="/admin"
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
            vide="Aucun agent affecté pour le moment."
          >
            {/* Affectation / réaffectation — action existante inchangée */}
            <form action={affecterBienAgent.bind(null, bien.id)} className="mt-4">
              <div className="flex flex-col gap-2.5">
                <select
                  name="agent_id"
                  defaultValue={bien.agent_id ?? ""}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  style={{ borderColor: "#E0DAC8", color: "#0F4C3A", background: "#fff" }}
                >
                  <option value="">— Aucun agent —</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nom_complet} ({a.role})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ background: "#0F4C3A", color: "#fff" }}
                >
                  {conseiller ? "Réaffecter" : "Affecter"}
                </button>
              </div>
            </form>
            {conseiller && (
              <Link
                href={`/admin/agents/${conseiller.id}`}
                className="block text-xs text-center mt-3 hover:underline"
                style={{ color: "#9DB8AD", textDecoration: "none" }}
              >
                Voir le profil de l&apos;agent →
              </Link>
            )}
          </CarteContactProfil>
        </div>
      </div>
    </div>
  );
}
