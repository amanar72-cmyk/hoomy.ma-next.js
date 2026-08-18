import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mes recherches — Mon espace",
};

export default async function PageMesRecherches() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/mon-compte/recherches");

  return (
    <div className="max-w-2xl mx-auto">

      {/* En-tête */}
      <div className="mb-6">
        <h1
          className="text-xl font-normal mb-0.5"
          style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}
        >
          Mes recherches sauvegardées
        </h1>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>
          Retrouvez ici les critères de recherche que vous avez sauvegardés.
        </p>
      </div>

      {/* État vide */}
      <div
        className="rounded-2xl flex flex-col items-center py-16 text-center"
        style={{ background: "#fff", border: "1px solid #F0EDE5" }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: "#F0FAF4" }}
        >
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#0F4C3A" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        <p className="text-sm font-semibold mb-2" style={{ color: "#0F4C3A" }}>
          Aucune recherche sauvegardée
        </p>
        <p className="text-sm max-w-xs mx-auto mb-6 leading-relaxed" style={{ color: "#9DB8AD" }}>
          Lancez une recherche de biens, affinez vos critères, puis utilisez le bouton
          <strong style={{ color: "#0F4C3A" }}> &laquo;&nbsp;Sauvegarder&nbsp;&raquo;</strong> pour la
          retrouver ici à tout moment.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/acheter"
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
            style={{ background: "#0F4C3A", color: "#fff", textDecoration: "none" }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Chercher un bien à acheter
          </Link>
          <Link
            href="/louer"
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl border hover:bg-gray-50 transition-colors"
            style={{ borderColor: "#E8E2D2", color: "#0F4C3A", textDecoration: "none" }}
          >
            Chercher un bien à louer
          </Link>
        </div>
      </div>

      {/* Info encart */}
      <div
        className="mt-4 rounded-xl px-4 py-3 flex items-start gap-3"
        style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
      >
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#D97706" strokeWidth="1.8" className="flex-shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-xs leading-relaxed" style={{ color: "#92400E" }}>
          La sauvegarde de recherches vous permettra de recevoir des alertes dès qu&apos;un bien
          correspondant à vos critères est publié. Cette fonctionnalité sera activée prochainement.
        </p>
      </div>
    </div>
  );
}
