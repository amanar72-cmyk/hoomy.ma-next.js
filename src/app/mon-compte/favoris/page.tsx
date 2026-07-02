import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { formaterPrix } from "@/lib/format";

export const metadata: Metadata = {
  title: "Mes favoris — Mon espace HOOMY.MA",
};

type BienFavori = {
  id: string;
  titre: string;
  slug: string | null;
  transaction: string;
  prix: number;
  ville: string;
  type: string;
  surface: number | null;
  chambres: number | null;
  photos: string[] | null;
  verifie: boolean;
};

type FavoriRow = {
  id: string;
  cree_le: string;
  biens: BienFavori | null;
};


function cheminBien(b: BienFavori) {
  return `/${b.transaction === "location" ? "louer" : "acheter"}/${b.slug ?? b.id}`;
}

export default async function PageMesFavoris() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/mon-compte/favoris");

  const { data: rows } = await supabase
    .from("favoris")
    .select("id, cree_le, biens(id, titre, slug, transaction, prix, ville, type, surface, chambres, photos, verifie)")
    .eq("user_id", user.id)
    .order("cree_le", { ascending: false });

  const favoris = (rows ?? []) as unknown as FavoriRow[];
  const biensValides = favoris.filter((f) => f.biens !== null);

  return (
    <div className="max-w-4xl mx-auto">

      {/* En-tête */}
      <div className="mb-6">
        <h1
          className="text-xl font-normal mb-0.5"
          style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}
        >
          Mes favoris
        </h1>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>
          {biensValides.length} bien{biensValides.length !== 1 ? "s" : ""} sauvegardé{biensValides.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* État vide */}
      {biensValides.length === 0 && (
        <div
          className="rounded-2xl flex flex-col items-center py-16 text-center"
          style={{ background: "#fff", border: "1px solid #F0EDE5" }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "#FFF9E6" }}
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#D4AF37" strokeWidth="1.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: "#0F4C3A" }}>
            Aucun favori pour l&apos;instant
          </p>
          <p className="text-sm mb-5" style={{ color: "#9DB8AD" }}>
            Cliquez sur le cœur d&apos;un bien pour le sauvegarder ici.
          </p>
          <Link
            href="/acheter"
            className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
            style={{ background: "#0F4C3A", color: "#fff", textDecoration: "none" }}
          >
            Explorer les biens
          </Link>
        </div>
      )}

      {/* Grille de biens */}
      {biensValides.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {biensValides.map(({ id: favoriId, biens: b }) => {
            if (!b) return null;
            const photo = b.photos?.[0] ?? null;
            const chemin = cheminBien(b);
            return (
              <article
                key={favoriId}
                className="rounded-2xl overflow-hidden flex flex-col"
                style={{
                  background: "#fff",
                  border: "1px solid #F0EDE5",
                  boxShadow: "0 2px 12px rgba(15,76,58,0.06)",
                }}
              >
                {/* Photo */}
                <Link href={chemin} style={{ textDecoration: "none" }}>
                  <div
                    className="relative overflow-hidden"
                    style={{ aspectRatio: "4/3", background: "#F4F6F5" }}
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo}
                        alt={b.titre}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#C4D8CE" strokeWidth="1.2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                      </div>
                    )}

                    {/* Badge transaction */}
                    <span
                      className="absolute top-2 left-2 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={
                        b.transaction === "location"
                          ? { background: "#D4AF37", color: "#0F4C3A" }
                          : { background: "#0F4C3A", color: "#fff" }
                      }
                    >
                      {b.transaction === "location" ? "À louer" : "À vendre"}
                    </span>

                    {b.verifie && (
                      <span
                        className="absolute top-2 right-2 text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1"
                        style={{ background: "rgba(255,255,255,0.92)", color: "#146C43" }}
                      >
                        <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Vérifié
                      </span>
                    )}
                  </div>
                </Link>

                {/* Infos */}
                <div className="flex flex-col flex-1 p-4">
                  <p
                    className="text-base font-semibold mb-0.5"
                    style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}
                  >
                    {formaterPrix(b.prix, b.transaction)}
                  </p>
                  <p className="text-sm font-medium line-clamp-2 mb-1.5" style={{ color: "#1f2a24" }}>
                    {b.titre}
                  </p>
                  <p className="text-xs mb-3" style={{ color: "#9DB8AD" }}>
                    {b.ville}
                    {b.surface ? ` · ${b.surface} m²` : ""}
                    {b.chambres ? ` · ${b.chambres} ch.` : ""}
                  </p>
                  <Link
                    href={chemin}
                    className="mt-auto text-sm font-semibold text-center py-2 rounded-xl hover:opacity-90 transition-opacity"
                    style={{ background: "#F0EDE5", color: "#0F4C3A", textDecoration: "none" }}
                  >
                    Voir l&apos;annonce →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
