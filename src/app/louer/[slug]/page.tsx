import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
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

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await supabase.from("biens").select("titre, ville, prix").eq("slug", slug).single();
  if (!data) return { title: "Bien non trouvé | HOOMY.MA" };
  const titre = `${data.titre} — À louer à ${data.ville} | HOOMY.MA`;
  const description = `${data.titre} à louer à ${data.ville}. Loyer : ${Number(data.prix).toLocaleString("fr-FR")} DH/mois.`;
  const ogImage = `/api/og?slug=${slug}`;
  return {
    title: titre,
    description,
    openGraph: {
      title: titre,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: "website",
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

  const { data } = await supabase.from("biens").select("*, agent_id").eq("slug", slug).single();
  if (!data) notFound();

  const bien = data as Bien & { agent_id: string | null };

  return (
    <main style={{ background: "#FAF7F0", minHeight: "100vh" }}>
      <Navbar />

      {/* ── Fil d'Ariane ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 pt-5">
        <nav
          aria-label="Fil d'Ariane"
          className="flex items-center flex-wrap gap-1.5 text-xs"
          style={{ color: "#9DB8AD" }}
        >
          <Link href="/" className="hover:underline" style={{ color: "#146C43", textDecoration: "none" }}>Accueil</Link>
          <span aria-hidden="true">›</span>
          <Link href="/louer" className="hover:underline" style={{ color: "#146C43", textDecoration: "none" }}>Louer</Link>
          <span aria-hidden="true">›</span>
          <Link href={`/louer?ville=${encodeURIComponent(bien.ville)}`} className="hover:underline" style={{ color: "#146C43", textDecoration: "none" }}>{bien.ville}</Link>
          <span aria-hidden="true">›</span>
          <span className="truncate max-w-[200px]" style={{ color: "#3D4A42" }}>{bien.titre}</span>
        </nav>
      </div>

      {/* ── Layout 2 colonnes : galerie+contenu gauche / carte droite ──────── */}
      <div className="max-w-7xl mx-auto px-6 pt-4 pb-16">
        <div className="flex gap-8">

          {/* Colonne gauche — galerie + infos */}
          <div className="flex-1 min-w-0">
            <GaleriePhotos
              photos={bien.photos ?? []}
              titre={bien.titre}
              transaction={bien.transaction}
              verifie={bien.verifie}
            />
            <div className="mt-10">
              <InfosBien bien={bien} />
              <CarteLocalisation
                latitude={bien.latitude}
                longitude={bien.longitude}
                titre={bien.titre}
              />
            </div>
          </div>

          {/* Colonne droite — carte contact (desktop) */}
          {/* La colonne s'étire sur toute la hauteur (flex stretch par défaut)
              pour que le sticky top-6 à l'intérieur fonctionne jusqu'en bas */}
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

        {/* Carte contact mobile — sous la galerie */}
        <div className="lg:hidden mt-6">
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

      {/* ── Biens similaires ─────────────────────────────────────────────── */}
      <BiensSimiliaires
        ville={bien.ville}
        type={bien.type}
        transaction={bien.transaction}
        idExclu={bien.id}
      />

      <Footer />
    </main>
  );
}
