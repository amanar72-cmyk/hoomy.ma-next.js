import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import CartePrixShell from "@/components/carte-prix/CartePrixShell";
import Navbar from "@/components/home/Navbar";

export const metadata: Metadata = {
  title: "Carte des prix immobiliers au Maroc — HOOMY.MA",
  description:
    "Explorez les prix au m² par ville et par quartier : Casablanca, Rabat, Marrakech, Tanger, Agadir.",
};

export type QuartierPrix = {
  nom: string;
  ville: string;
  prix_m2_appartement: number | null;
  prix_m2_villa: number | null;
  prix_m2_moyen: number | null;
};

export type MoyenneVille = {
  ville: string;
  prixMoyen: number;
  lat: number;
  lng: number;
};

const COORDS_VILLES: Record<string, { lat: number; lng: number }> = {
  Casablanca: { lat: 33.5731, lng: -7.5898 },
  Rabat:      { lat: 34.0209, lng: -6.8416 },
  Marrakech:  { lat: 31.6295, lng: -7.9811 },
  Tanger:     { lat: 35.7595, lng: -5.834 },
  Agadir:     { lat: 30.4278, lng: -9.5981 },
};

const VILLES = Object.keys(COORDS_VILLES);

export default async function CartePrixPage() {
  const { data, error } = await supabase
    .from("quartiers")
    .select("nom, ville, prix_m2_appartement, prix_m2_villa, prix_m2_moyen")
    .in("ville", VILLES)
    .not("prix_m2_moyen", "is", null);

  const quartiers: QuartierPrix[] = error ? [] : (data ?? []);

  // Calcule la moyenne des prix_m2_moyen par ville côté serveur
  const moyennesVilles: MoyenneVille[] = VILLES.map((ville) => {
    const quartiersVille = quartiers.filter(
      (q) => q.ville === ville && q.prix_m2_moyen != null
    );
    const somme = quartiersVille.reduce((acc, q) => acc + (q.prix_m2_moyen ?? 0), 0);
    const prixMoyen = quartiersVille.length > 0 ? Math.round(somme / quartiersVille.length) : 0;
    return { ville, prixMoyen, ...COORDS_VILLES[ville] };
  }).filter((v) => v.prixMoyen > 0);

  return (
    <>
      <Navbar />
      <main
        style={{ background: "#0a2418", minHeight: "100vh" }}
        className="flex flex-col"
      >
        <div className="px-4 pt-6 pb-2 lg:px-10">
          <h1
            style={{
              fontFamily: "var(--font-marcellus)",
              color: "#D4AF37",
              fontSize: "clamp(1.4rem, 3vw, 2rem)",
              letterSpacing: "0.04em",
            }}
          >
            Carte des prix immobiliers
          </h1>
          <p style={{ color: "#9BC4A8", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Prix de vente au m² · Vente · Maroc
          </p>
        </div>

        <CartePrixShell quartiers={quartiers} moyennesVilles={moyennesVilles} />
      </main>
    </>
  );
}
