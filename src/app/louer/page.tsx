import { supabase } from "@/lib/supabase";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import FiltresBar from "@/components/annonces/FiltresBar";
import CarteAnnonce from "@/components/annonces/CarteAnnonce";
import TriSelect from "@/components/annonces/TriSelect";
import type { Bien, FiltresActifs } from "@/lib/types";
import { TRI_MAP } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function str(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

export default async function PageLouer({ searchParams }: Props) {
  const sp = await searchParams;

  const ville    = str(sp.ville);
  const type     = str(sp.type);
  const prixMin  = str(sp.prixMin);
  const prixMax  = str(sp.prixMax);
  const chambres = str(sp.chambres);
  const tri      = str(sp.tri) || "cree_le_desc";

  const filtresActifs: FiltresActifs = { ville, type, prixMin, prixMax, chambres, tri };

  const paramsActifs: Record<string, string> = {};
  if (ville)    paramsActifs.ville    = ville;
  if (type)     paramsActifs.type     = type;
  if (prixMin)  paramsActifs.prixMin  = prixMin;
  if (prixMax)  paramsActifs.prixMax  = prixMax;
  if (chambres) paramsActifs.chambres = chambres;

  // ── Requête Supabase — transaction = "location" ──
  let query = supabase.from("biens").select("*").eq("transaction", "location");

  if (ville)   query = query.eq("ville", ville);
  if (type)    query = query.eq("type", type);
  if (prixMin) query = query.gte("prix", Number(prixMin));
  if (prixMax) query = query.lte("prix", Number(prixMax));

  if (chambres === "5+") {
    query = query.gte("chambres", 5);
  } else if (chambres) {
    query = query.gte("chambres", Number(chambres));
  }

  const triConfig = TRI_MAP[tri] ?? TRI_MAP["cree_le_desc"];
  query = query.order(triConfig.colonne, { ascending: triConfig.ascending });

  const { data } = await query;
  const biens = (data ?? []) as Bien[];

  return (
    <main style={{ background: "#FAF7F0", minHeight: "100vh" }}>
      <Navbar />

      <FiltresBar
        key={JSON.stringify(filtresActifs)}
        defaultFiltres={filtresActifs}
        total={biens.length}
      />

      <div className="max-w-6xl mx-auto px-6 py-8">

        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 mb-8">
          <div>
            <h1
              className="text-3xl font-normal mb-1"
              style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}
            >
              Biens à louer au Maroc
            </h1>
            <p className="text-sm" style={{ color: "#6B6450" }}>
              <span className="font-semibold" style={{ color: "#0F4C3A" }}>{biens.length}</span>{" "}
              bien{biens.length !== 1 ? "s" : ""} disponible{biens.length !== 1 ? "s" : ""}
              {" "}<span style={{ color: "#B4AD97" }}>· Prix en DH/mois</span>
            </p>
          </div>
          <TriSelect key={tri} tri={tri} paramsActifs={paramsActifs} />
        </div>

        {biens.length === 0 ? (
          <div className="text-center py-24">
            <div className="mb-4" style={{ fontSize: 48 }}>🏠</div>
            <p
              className="text-xl font-normal mb-2"
              style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}
            >
              Aucun bien trouvé
            </p>
            <p className="text-sm" style={{ color: "#888" }}>
              Essayez d'élargir vos critères de recherche ou de changer de ville.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {biens.map((bien) => (
              <CarteAnnonce key={bien.id} bien={bien} />
            ))}
          </div>
        )}

      </div>

      <Footer />
    </main>
  );
}
