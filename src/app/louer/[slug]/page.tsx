import { supabase } from "@/lib/supabase";
import { notFound, permanentRedirect } from "next/navigation";
import { formaterPrix } from "@/lib/format";
import { flouterPosition } from "@/lib/geo/floutage";
import type { Metadata } from "next";
import type { Bien } from "@/lib/types";
import Link from "next/link";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import GaleriePhotos from "@/components/detail/GaleriePhotos";
import InfosBien from "@/components/detail/InfosBien";
import CarteContact from "@/components/detail/CarteContact";
import CarteLocalisation from "@/components/detail/CarteLocalisation";
import BiensSimiliaires from "@/components/detail/BiensSimiliaires";
import TrackVue from "@/components/tracking/TrackVue";
import BarreMobileContact from "@/components/detail/BarreMobileContact";
import RappelBien from "@/components/leads/RappelBien";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

/** Cherche un bien par slug, puis par id (UUID) en fallback. */
async function fetchBien(slug: string) {
  const { data: bySlug } = await supabase
    .from("biens").select("*, agent_id").eq("slug", slug).maybeSingle();
  if (bySlug) return bySlug;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  if (!isUUID) return null;
  const { data: byId } = await supabase
    .from("biens").select("*, agent_id").eq("id", slug).maybeSingle();
  return byId ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // Même logique que la page (slug puis UUID) — l'URL canonique reste toujours le slug
  const data = await fetchBien(slug);
  if (!data) return { title: "Bien non trouvé | HOOMY.MA" };
  const slugCanonique = data.slug ?? slug;
  const titre = `${data.titre} — À louer à ${data.ville} | HOOMY.MA`;
  const description = `${data.titre} à louer à ${data.ville}. Loyer : ${formaterPrix(Number(data.prix), "location")}.`;
  const ogImage = `/api/og?slug=${slugCanonique}&v=2`; // v=2 : force WhatsApp à recharger le nouveau design
  const pageUrl = `/louer/${slugCanonique}`;
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

export default async function PageDetailLocation({ params }: Props) {
  const { slug } = await params;

  const data = await fetchBien(slug);
  if (!data) notFound();

  const bien = data as Bien & { agent_id: string | null };

  // Un bien en vente ne doit jamais être servi sous /louer → URL canonique
  if (bien.transaction !== "location") {
    permanentRedirect(`/acheter/${bien.slug ?? bien.id}`);
  }

  // Accès par UUID alors qu'un slug existe → redirection permanente vers l'URL slug
  if (bien.slug && slug !== bien.slug) {
    permanentRedirect(`/louer/${bien.slug}`);
  }

  // Floutage côté serveur : le navigateur ne reçoit jamais la position exacte
  const positionApprox =
    bien.latitude != null && bien.longitude != null
      ? flouterPosition(bien.id, bien.latitude, bien.longitude)
      : null;

  return (
    <main style={{ background: "var(--fond-principal)", minHeight: "100vh" }}>
      <TrackVue bienId={bien.id} />
      <Navbar />

      {/* ── Fil d'Ariane ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 pt-5">
        <nav
          aria-label="Fil d'Ariane"
          className="flex items-center flex-wrap gap-1.5 text-xs"
          style={{ color: "var(--texte-tertiaire)" }}
        >
          <Link href="/" className="hover:underline" style={{ color: "var(--primaire-clair)", textDecoration: "none" }}>Accueil</Link>
          <span aria-hidden="true">›</span>
          <Link href="/louer" className="hover:underline" style={{ color: "var(--primaire-clair)", textDecoration: "none" }}>Louer</Link>
          <span aria-hidden="true">›</span>
          <Link href={`/louer?ville=${encodeURIComponent(bien.ville)}`} className="hover:underline" style={{ color: "var(--primaire-clair)", textDecoration: "none" }}>{bien.ville}</Link>
          <span aria-hidden="true">›</span>
          <span className="truncate max-w-[200px]" style={{ color: "var(--texte-corps)" }}>{bien.titre}</span>
        </nav>
      </div>

      {/* ── Galerie pleine largeur ──────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <GaleriePhotos
          photos={bien.photos ?? []}
          titre={bien.titre}
          transaction={bien.transaction}
          verifie={bien.verifie}
        />
      </div>

      {/* ── Layout 2 colonnes : infos gauche / prix droit ─────────────────── */}
      <div className="max-w-7xl mx-auto px-6 pt-8">
        <div className="flex gap-8 items-start">

          {/* Colonne gauche — détails + équipements */}
          <div className="flex-1 min-w-0">
            <InfosBien bien={bien} />
            {/* Qualification de lead — bien_id + type de projet pré-remplis */}
            <RappelBien bienId={bien.id} titreBien={bien.titre} transaction={bien.transaction} />
          </div>

          {/* Colonne droite — carte contact sticky (desktop) */}
          <div className="hidden lg:block w-[340px] flex-shrink-0">
            <CarteContact
              prix={bien.prix}
              transaction={bien.transaction}
              titre={bien.titre}
              chemin={`louer/${slug}`}
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
