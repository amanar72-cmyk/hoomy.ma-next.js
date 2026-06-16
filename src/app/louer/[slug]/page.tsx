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
  const { data } = await supabase.from("biens").select("titre").eq("slug", slug).single();
  return {
    title: data?.titre ? `${data.titre} | HOOMY.MA` : "Bien non trouvé | HOOMY.MA",
  };
}

export default async function PageDetailLocation({ params }: Props) {
  const { slug } = await params;

  const { data } = await supabase.from("biens").select("*").eq("slug", slug).single();
  if (!data) notFound();

  const bien = data as Bien;

  return (
    <main style={{ background: "#FAF7F0", minHeight: "100vh" }}>
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 pt-6 pb-16">

        {/* Fil d'Ariane */}
        <nav aria-label="Fil d'Ariane" className="flex items-center flex-wrap gap-1.5 text-sm mb-6" style={{ color: "#9DB8AD" }}>
          <Link href="/" style={{ color: "#146C43", textDecoration: "none" }} className="hover:underline">Accueil</Link>
          <span aria-hidden="true">›</span>
          <Link href="/louer" style={{ color: "#146C43", textDecoration: "none" }} className="hover:underline">Louer</Link>
          <span aria-hidden="true">›</span>
          <Link href={`/louer?ville=${encodeURIComponent(bien.ville)}`} style={{ color: "#146C43", textDecoration: "none" }} className="hover:underline">
            {bien.ville}
          </Link>
          <span aria-hidden="true">›</span>
          <span className="truncate max-w-xs" style={{ color: "#3D4A42" }}>{bien.titre}</span>
        </nav>

        {/* Galerie photos */}
        <GaleriePhotos
          photos={bien.photos ?? []}
          titre={bien.titre}
          transaction={bien.transaction}
          verifie={bien.verifie}
        />

        {/* Corps principal : 65 % + 35 % */}
        <div className="flex gap-8 mt-8 items-start">

          {/* Colonne gauche */}
          <div className="flex-1 min-w-0">
            <InfosBien bien={bien} />
            <CarteLocalisation
              latitude={bien.latitude}
              longitude={bien.longitude}
              titre={bien.titre}
            />
          </div>

          {/* Colonne droite sticky */}
          <div className="w-80 flex-shrink-0">
            <CarteContact
              prix={bien.prix}
              transaction={bien.transaction}
              titre={bien.titre}
              chemin={`louer/${slug}`}
            />
          </div>

        </div>
      </div>

      {/* Biens similaires */}
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
