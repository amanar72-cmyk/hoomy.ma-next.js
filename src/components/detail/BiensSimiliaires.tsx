import { supabase } from "@/lib/supabase";
import Link from "next/link";
import type { Bien } from "@/lib/types";

type Props = {
  ville: string;
  type: string;
  transaction: string;
  idExclu: string;
};

function formatPrix(prix: number, transaction: string) {
  return `${prix.toLocaleString("fr-FR")} DH${transaction === "location" ? "/mois" : ""}`;
}

function cheminBien(bien: Bien) {
  const action = bien.transaction === "location" ? "louer" : "acheter";
  return `/${action}/${bien.slug ?? bien.id}`;
}

export default async function BiensSimiliaires({ ville, type, transaction, idExclu }: Props) {
  const { data } = await supabase
    .from("biens")
    .select("*")
    .eq("transaction", transaction)
    .eq("ville", ville)
    .neq("id", idExclu)
    .limit(3);

  const biens = (data ?? []) as Bien[];
  if (biens.length === 0) return null;

  return (
    <section className="py-16 px-6" style={{ background: "var(--fond-accent)" }}>
      <div className="max-w-7xl mx-auto">

        {/* ── En-tête section ── */}
        <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
          <div>
            <p className="text-xs font-medium tracking-widest uppercase mb-2" style={{ color: "var(--accent)" }}>
              Découvrir aussi
            </p>
            <h2
              className="text-2xl font-normal"
              style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}
            >
              Biens similaires à {ville}
            </h2>
          </div>
          <Link
            href={`/${transaction === "location" ? "louer" : "acheter"}?ville=${encodeURIComponent(ville)}`}
            className="text-sm font-medium flex items-center gap-1.5 hover:gap-2.5 transition-all"
            style={{ color: "var(--primaire-clair)", textDecoration: "none" }}
          >
            Voir tout
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>

        {/* ── Grille cartes ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {biens.map((bien) => (
            <Link
              key={bien.id}
              href={cheminBien(bien)}
              className="group block"
              style={{ textDecoration: "none" }}
            >
              <article
                className="rounded-2xl overflow-hidden flex flex-col h-full transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-xl"
                style={{ background: "var(--fond-secondaire)", border: "1px solid #EDE7D7", boxShadow: "0 2px 16px rgba(15,76,58,0.06)" }}
              >
                {/* Photo */}
                <div className="relative overflow-hidden" style={{ height: 220, background: "var(--bordure)" }}>
                  {bien.photos?.[0] ? (
                    <img
                      src={bien.photos[0]}
                      alt={bien.titre}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#C2BBA3" strokeWidth="1.2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    </div>
                  )}

                  {/* Badge */}
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={
                        bien.transaction === "location"
                          ? { background: "var(--accent)", color: "var(--primaire)" }
                          : { background: "var(--primaire)", color: "var(--fond-secondaire)" }
                      }
                    >
                      {bien.transaction === "location" ? "À louer" : "À vendre"}
                    </span>
                    {bien.verifie && (
                      <span
                        className="text-xs font-medium px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(255,255,255,0.92)", color: "var(--primaire-clair)" }}
                      >
                        ✓ Vérifié
                      </span>
                    )}
                  </div>
                </div>

                {/* Contenu */}
                <div className="p-5 flex flex-col flex-1">
                  {bien.reference && (
                    <p className="text-xs mb-1.5 font-mono" style={{ color: "#B4AD97" }}>{bien.reference}</p>
                  )}

                  <p
                    className="text-base leading-snug line-clamp-2 mb-2 flex-1"
                    style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}
                  >
                    {bien.titre}
                  </p>

                  <p className="flex items-center gap-1 text-xs mb-3" style={{ color: "var(--texte-secondaire)" }}>
                    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                    {bien.quartier ? `${bien.quartier}, ` : ""}{bien.ville}
                  </p>

                  <div
                    className="flex items-center justify-between pt-3"
                    style={{ borderTop: "1px solid #F0EDE5" }}
                  >
                    <p className="text-lg font-semibold" style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--accent)" }}>
                      {formatPrix(bien.prix, bien.transaction)}
                    </p>
                    <div className="flex items-center gap-3 text-xs" style={{ color: "var(--texte-brun)" }}>
                      <span>{bien.surface} m²</span>
                      <span style={{ color: "var(--bordure-chaude)" }}>·</span>
                      <span>{bien.chambres} ch.</span>
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
