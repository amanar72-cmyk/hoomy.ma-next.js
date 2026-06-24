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

export default async function PageAcheter({ searchParams }: Props) {
  const sp = await searchParams;

  const ville    = str(sp.ville);
  const quartier = str(sp.quartier); // peut être "Gueliz,Hivernage" (CSV multi-quartier)
  const type     = str(sp.type);
  const prixMin  = str(sp.prixMin);
  const prixMax  = str(sp.prixMax);
  const chambres = str(sp.chambres);
  const tri      = str(sp.tri) || "cree_le_desc";

  // Découpe le CSV en tableau, filtre les entrées vides
  const quartiersArr = quartier ? quartier.split(",").map((q) => q.trim()).filter(Boolean) : [];

  const filtresActifs: FiltresActifs = { ville, quartier, type, prixMin, prixMax, chambres, tri };

  // Params actifs sans "tri" (pour que TriSelect les préserve lors du changement de tri)
  const paramsActifs: Record<string, string> = {};
  if (ville)    paramsActifs.ville    = ville;
  if (quartier) paramsActifs.quartier = quartier;
  if (type)     paramsActifs.type     = type;
  if (prixMin)  paramsActifs.prixMin  = prixMin;
  if (prixMax)  paramsActifs.prixMax  = prixMax;
  if (chambres) paramsActifs.chambres = chambres;

  // ── Construction de la requête Supabase ──
  let query = supabase.from("biens").select("*").eq("transaction", "vente");

  if (ville) query = query.eq("ville", ville);
  if (quartiersArr.length === 1) query = query.eq("quartier", quartiersArr[0]);
  else if (quartiersArr.length > 1) query = query.in("quartier", quartiersArr);
  if (type)     query = query.eq("type", type);
  if (prixMin)  query = query.gte("prix", Number(prixMin));
  if (prixMax)  query = query.lte("prix", Number(prixMax));

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
    <main style={{ background: "var(--fond-principal)", minHeight: "100vh" }}>
      <Navbar />

      {/* FiltresBar : key force le remontage quand les filtres changent → état local synchronisé */}
      <FiltresBar
        key={JSON.stringify(filtresActifs)}
        defaultFiltres={filtresActifs}
        total={biens.length}
      />

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* En-tête + tri */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 mb-8">
          <div>
            <h1
              className="text-3xl font-normal mb-1"
              style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}
            >
              Biens à vendre au Maroc
            </h1>
            <p className="text-sm" style={{ color: "var(--texte-chaud)" }}>
              <span className="font-semibold" style={{ color: "var(--primaire)" }}>{biens.length}</span>{" "}
              bien{biens.length !== 1 ? "s" : ""} disponible{biens.length !== 1 ? "s" : ""}
            </p>
          </div>
          <TriSelect key={tri} tri={tri} paramsActifs={paramsActifs} />
        </div>

        {biens.length === 0 ? (
          <div className="flex flex-col items-center py-28 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "var(--fond-vert-leger)" }}
            >
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="var(--primaire)" strokeWidth="1.4">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <p className="text-xl font-normal mb-2" style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}>
              Aucun bien trouvé
            </p>
            <p className="text-sm max-w-xs" style={{ color: "var(--texte-tertiaire)" }}>
              Essayez d'élargir vos critères ou de changer de ville.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
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
