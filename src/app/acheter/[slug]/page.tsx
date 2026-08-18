import { supabase } from "@/lib/supabase";
import { notFound, permanentRedirect } from "next/navigation";
import { obtenirPositionApprox } from "@/lib/geo/positionApprox";
import type { Metadata } from "next";
import type { BienPublic } from "@/lib/types";
import { COLONNES_BIEN_PUBLIC } from "@/lib/types";
import { descriptionMeta, jsonLdBien, jsonLdFilAriane } from "@/lib/seo/bien";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import GaleriePhotos from "@/components/detail/GaleriePhotos";
import InfosBien from "@/components/detail/InfosBien";
import CarteContact from "@/components/detail/CarteContact";
import CarteLocalisation from "@/components/detail/CarteLocalisation";
import BiensSimiliaires from "@/components/detail/BiensSimiliaires";
import TrackVue from "@/components/tracking/TrackVue";
import MetaViewContent from "@/components/tracking/MetaViewContent";
import BarreMobileContact from "@/components/detail/BarreMobileContact";
import RappelBien from "@/components/leads/RappelBien";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

/** Cherche un bien par slug, puis par id (UUID) en fallback. */
// jamais latitude/longitude côté anon (voir lib/geo/positionApprox.ts)
const COLONNES_DETAIL = `${COLONNES_BIEN_PUBLIC}, agent_id`;

async function fetchBien(slug: string) {
  const { data: bySlug } = await supabase
    .from("biens").select(COLONNES_DETAIL).eq("slug", slug).maybeSingle();
  if (bySlug) return bySlug;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  if (!isUUID) return null;
  const { data: byId } = await supabase
    .from("biens").select(COLONNES_DETAIL).eq("id", slug).maybeSingle();
  return byId ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // Même logique que la page (slug puis UUID) — l'URL canonique reste toujours le slug
  const data = await fetchBien(slug);
  if (!data) return { title: "Bien non trouvé" };
  const slugCanonique = data.slug ?? slug;
  // Pas de « | HOOMY.MA » ici : le suffixe est ajouté par title.template du
  // layout racine. L'écrire aussi donnerait « … | HOOMY.MA | HOOMY.MA ».
  const titre = `${data.titre} — À vendre à ${data.ville}`;
  // Texte réel du bien si disponible, formule générique sinon (lib/seo/bien.ts).
  const description = descriptionMeta(data as unknown as BienPublic);
  const ogImage = `/api/og?slug=${slugCanonique}&v=2`; // v=2 : force WhatsApp à recharger le nouveau design
  const pageUrl = `/acheter/${slugCanonique}`;
  return {
    title: titre,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title: titre,
      description,
      url: pageUrl,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, type: "image/jpeg", alt: data.titre }],
    },
    twitter: {
      card: "summary_large_image",
      title: titre,
      description,
      images: [ogImage],
    },
  };
}

export default async function PageDetailAchat({ params }: Props) {
  const { slug } = await params;

  const data = await fetchBien(slug);
  if (!data) notFound();

  const bien = data as BienPublic & { agent_id: string | null };

  // Un bien en location ne doit jamais être servi sous /acheter → URL canonique
  if (bien.transaction === "location") {
    permanentRedirect(`/louer/${bien.slug ?? bien.id}`);
  }

  // Accès par UUID alors qu'un slug existe → redirection permanente vers l'URL slug
  if (bien.slug && slug !== bien.slug) {
    permanentRedirect(`/acheter/${bien.slug}`);
  }

  // Coordonnées lues séparément en service_role puis floutées : le navigateur
  // ne reçoit jamais la position exacte (voir lib/geo/positionApprox.ts).
  const positionApprox = await obtenirPositionApprox(bien.id);

  return (
    <main style={{ background: "var(--fond-principal)", minHeight: "100vh" }}>
      <TrackVue bienId={bien.id} />
      {/* Retargeting Meta — uniquement si le bien a une référence HM-XXXX
          (clé du Pixel + futur catalogue). Consent-gated côté composant. */}
      {bien.reference && (
        <MetaViewContent reference={bien.reference} titre={bien.titre} prix={bien.prix} />
      )}
      <Navbar />

      {/* ── Données structurées ───────────────────────────────────────────
          Fil d'Ariane : le fil VISIBLE a été retiré (la photo démarre sous la
          navbar), mais le chemin reste déclaré aux moteurs — sans lui, Google
          perd la ligne Accueil › Acheter › Ville sous le résultat de recherche.

          RealEstateListing : sans cette déclaration, rien n'indique aux
          moteurs que la page décrit un bien à vendre avec un prix. C'est ce
          qui ouvre l'accès aux résultats enrichis (prix, photo, disponibilité).
          Tous les champs proviennent de la base ; les absents sont omis. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFilAriane(bien)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBien(bien)) }}
      />

      {/* ── Galerie pleine largeur (plein bord sur mobile, insérée sur desktop) ── */}
      <div className="max-w-7xl mx-auto px-0 md:px-6 pt-0 md:pt-4">
        <GaleriePhotos
          photos={bien.photos ?? []}
          titre={bien.titre}
          transaction={bien.transaction}
          verifie={bien.verifie}
          hrefRetour="/acheter"
        />
      </div>

      {/* ── Layout 2 colonnes : infos gauche / prix droit ─────────────────── */}
      <div className="max-w-7xl mx-auto px-6 pt-8">
        <div className="flex gap-8 items-start">

          {/* Colonne gauche — détails + équipements */}
          <div className="flex-1 min-w-0">
            <InfosBien bien={bien} />
            {/* Qualification de lead — bien_id + type de projet pré-remplis */}
            <RappelBien bienId={bien.id} titreBien={bien.titre} transaction={bien.transaction} reference={bien.reference} />
          </div>

          {/* Colonne droite — carte contact sticky (desktop) */}
          <div className="hidden lg:block w-[340px] flex-shrink-0">
            <CarteContact
              prix={bien.prix}
              transaction={bien.transaction}
              titre={bien.titre}
              chemin={`acheter/${slug}`}
              bienId={bien.id}
              agentId={bien.agent_id ?? null}
              slug={slug}
            />
          </div>

        </div>
      </div>

      {/* ── Localisation (après les détails et équipements) ───────────────── */}
      <div className="max-w-7xl mx-auto px-6 pb-24 lg:pb-16">
        <CarteLocalisation
          latitude={positionApprox?.lat ?? null}
          longitude={positionApprox?.lng ?? null}
          titre={bien.titre}
          bienId={bien.id}
        />
      </div>

      {/* Barre d'action flottante mobile */}
      <BarreMobileContact
        prix={bien.prix}
        transaction={bien.transaction}
        titre={bien.titre}
        reference={bien.reference ?? null}
        ville={bien.ville}
        bienId={bien.id}
        agentId={bien.agent_id ?? null}
      />

      {/* ── Biens similaires ─────────────────────────────────────────────── */}
      <BiensSimiliaires
        ville={bien.ville}
        type={bien.type}
        transaction={bien.transaction}
        idExclu={bien.id}
        quartier={bien.quartier}
        prix={bien.prix}
        chambres={bien.chambres}
      />

      <Footer />
    </main>
  );
}
