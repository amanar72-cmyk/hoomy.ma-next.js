import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import StatCard from "@/components/compte/StatCard";
import BadgeStatut from "@/components/compte/BadgeStatut";
import EtatVide from "@/components/compte/EtatVide";

// ── Types ─────────────────────────────────────────────────────────────────────

type BienClient = {
  id: string;
  reference: string | null;
  titre: string;
  type: string;
  transaction: string;
  prix: number;
  ville: string;
  photos: string[] | null;
  statut: string | null;
  date_soumission: string | null;
};

type BienSuggestion = {
  id: string;
  titre: string;
  type: string;
  transaction: string;
  prix: number;
  ville: string;
  photos: string[] | null;
};

// ── Utilitaires ───────────────────────────────────────────────────────────────

function formaterPrix(prix: number, transaction: string) {
  const m = prix.toLocaleString("fr-MA");
  return transaction === "location" ? `${m} DH/mois` : `${m} DH`;
}

function formaterDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-MA", { day: "2-digit", month: "long", year: "numeric" });
}

function formaterDateCourte(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("fr-MA", { day: "2-digit", month: "short" });
}

// ── Icônes stat cards ─────────────────────────────────────────────────────────

const IcoBien = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const IcoCoeur = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const IcoCalendrier = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IcoBoite = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

const IcoBienVide = () => (
  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PageTableauDeBord() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const [{ data: profil }, { data: biensRaw }, { data: suggestionsRaw }] = await Promise.all([
    supabase
      .from("profils")
      .select("nom_complet, cree_le")
      .eq("id", user.id)
      .single(),

    supabase
      .from("biens")
      .select("id, reference, titre, type, transaction, prix, ville, photos, statut, date_soumission")
      .eq("proprietaire_id", user.id)
      .order("date_soumission", { ascending: false }),

    supabase
      .from("biens")
      .select("id, titre, type, transaction, prix, ville, photos")
      .eq("verifie", true)
      .order("cree_le", { ascending: false })
      .limit(3),
  ]);

  const biens = (biensRaw ?? []) as BienClient[];
  const suggestions = (suggestionsRaw ?? []) as BienSuggestion[];

  const prenom = profil?.nom_complet?.trim().split(" ")[0] ?? user.email?.split("@")[0] ?? "vous";

  // Biens actifs (non retirés, non brouillon)
  const biensActifs = biens.filter(
    (b) => b.statut && !["brouillon", "retire"].includes(b.statut)
  );

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── En-tête de bienvenue ────────────────────────────────────────── */}
      <div className="mb-8">
        <h1
          className="text-2xl md:text-3xl font-normal mb-1 capitalize"
          style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}
        >
          Bonjour {prenom} 👋
        </h1>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>
          Bienvenue sur votre espace personnel HOOMY.MA
        </p>
      </div>

      {/* ── Cartes de statistiques ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard
          icone={<IcoBien />}
          valeur={biens.length}
          label="Biens soumis"
          couleurIcone="#0F4C3A"
          fondIcone="#E8F5ED"
        />
        <StatCard
          icone={<IcoCoeur />}
          valeur={0}
          label="Favoris"
          couleurIcone="#D4AF37"
          fondIcone="#FFF9E6"
          placeholder
        />
        <StatCard
          icone={<IcoCalendrier />}
          valeur={0}
          label="Visites à venir"
          couleurIcone="#5B21B6"
          fondIcone="#EDE9FE"
          placeholder
        />
        <StatCard
          icone={<IcoBoite />}
          valeur={0}
          label="Demandes en cours"
          couleurIcone="#1E40AF"
          fondIcone="#DBEAFE"
          placeholder
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Colonne principale (2/3) ──────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Bloc : Mes biens en cours */}
          <section
            className="rounded-2xl overflow-hidden"
            style={{ background: "#fff", border: "1px solid #F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.06)" }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid #F0EDE5" }}
            >
              <h2 className="text-base font-semibold" style={{ color: "#0F4C3A" }}>
                Mes biens en cours
              </h2>
              {biens.length > 0 && (
                <Link
                  href="/mon-compte/mes-biens"
                  className="text-xs font-medium hover:underline"
                  style={{ color: "#9DB8AD" }}
                >
                  Voir tout →
                </Link>
              )}
            </div>

            {biensActifs.length === 0 ? (
              <EtatVide
                icone={<IcoBienVide />}
                titre="Aucun bien soumis"
                message="Publiez votre premier bien et notre équipe vous accompagne pour trouver le bon acheteur ou locataire."
                cta={{ label: "Publier un bien", href: "/publier" }}
              />
            ) : (
              <div className="divide-y" style={{ borderColor: "#F8F5EE" }}>
                {biensActifs.slice(0, 5).map((b) => {
                  const photo = (b.photos as string[] | null)?.[0] ?? null;
                  return (
                    <div key={b.id} className="flex gap-3 px-5 py-4 items-start">
                      {/* Photo */}
                      <div
                        className="flex-shrink-0 rounded-xl overflow-hidden"
                        style={{ width: 56, height: 48, background: "#F4F6F5" }}
                      >
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#C4D8CE" strokeWidth="1.5">
                              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      {/* Infos */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-medium truncate" style={{ color: "#1f2a24" }}>
                            {b.titre}
                          </p>
                          <BadgeStatut statut={b.statut} />
                        </div>
                        <p className="text-xs" style={{ color: "#9DB8AD" }}>
                          {b.type} · {b.ville} · {formaterPrix(b.prix, b.transaction)}
                        </p>
                        {b.reference && (
                          <p className="text-xs font-mono mt-0.5" style={{ color: "#C4D8CE" }}>
                            {b.reference}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Bloc : Activité récente */}
          <section
            className="rounded-2xl overflow-hidden"
            style={{ background: "#fff", border: "1px solid #F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.06)" }}
          >
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #F0EDE5" }}>
              <h2 className="text-base font-semibold" style={{ color: "#0F4C3A" }}>
                Activité récente
              </h2>
            </div>

            {biens.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm" style={{ color: "#C4D8CE" }}>Aucune activité pour l&apos;instant</p>
              </div>
            ) : (
              <div className="px-5 py-4">
                <ol className="relative" style={{ borderLeft: "2px solid #E8F5ED", paddingLeft: 20 }}>
                  {biens.slice(0, 6).map((b) => (
                    <li key={b.id} className="mb-5 last:mb-0 relative">
                      {/* Point sur la timeline */}
                      <span
                        className="absolute -left-[25px] top-1 w-3 h-3 rounded-full border-2"
                        style={{ background: "#E8F5ED", borderColor: "#0F4C3A" }}
                      />
                      <p className="text-xs mb-0.5" style={{ color: "#9DB8AD" }}>
                        {formaterDateCourte(b.date_soumission)}
                      </p>
                      <p className="text-sm font-medium truncate" style={{ color: "#1f2a24" }}>
                        {b.titre}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs" style={{ color: "#9DB8AD" }}>Soumis · {b.ville}</p>
                        <BadgeStatut statut={b.statut} />
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        </div>

        {/* ── Colonne secondaire (1/3) ─────────────────────────────────── */}
        <div className="flex flex-col gap-6">

          {/* Bloc : Accès rapides */}
          <section
            className="rounded-2xl p-5"
            style={{ background: "#fff", border: "1px solid #F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.06)" }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: "#0F4C3A" }}>
              Accès rapides
            </h2>
            <div className="flex flex-col gap-2">
              <Link
                href="/publier"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                style={{ background: "#D4AF37", color: "#0F4C3A", textDecoration: "none" }}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Publier un bien
              </Link>
              <Link
                href="/acheter"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border hover:bg-gray-50 transition-colors"
                style={{ borderColor: "#E8E2D2", color: "#0F4C3A", textDecoration: "none" }}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                Chercher un bien
              </Link>
              <Link
                href="/mon-compte/mes-biens"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border hover:bg-gray-50 transition-colors"
                style={{ borderColor: "#E8E2D2", color: "#0F4C3A", textDecoration: "none" }}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Mes biens soumis
              </Link>
            </div>
          </section>

          {/* Bloc : Suggestions */}
          {suggestions.length > 0 && (
            <section
              className="rounded-2xl overflow-hidden"
              style={{ background: "#fff", border: "1px solid #F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.06)" }}
            >
              <div className="px-4 py-4" style={{ borderBottom: "1px solid #F0EDE5" }}>
                <h2 className="text-sm font-semibold" style={{ color: "#0F4C3A" }}>
                  Biens à découvrir
                </h2>
              </div>
              <div className="divide-y" style={{ borderColor: "#F8F5EE" }}>
                {suggestions.map((s) => {
                  const photo = (s.photos as string[] | null)?.[0] ?? null;
                  return (
                    <Link
                      key={s.id}
                      href={`/${s.transaction === "location" ? "louer" : "acheter"}/${s.id}`}
                      className="flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      style={{ textDecoration: "none" }}
                    >
                      <div
                        className="flex-shrink-0 rounded-lg overflow-hidden"
                        style={{ width: 44, height: 40, background: "#F4F6F5" }}
                      >
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#C4D8CE" strokeWidth="1.5">
                              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate mb-0.5" style={{ color: "#1f2a24" }}>
                          {s.titre}
                        </p>
                        <p className="text-xs truncate" style={{ color: "#9DB8AD" }}>
                          {s.ville} · {formaterPrix(s.prix, s.transaction)}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <div className="px-4 py-3" style={{ borderTop: "1px solid #F0EDE5" }}>
                <Link
                  href="/acheter"
                  className="text-xs font-medium hover:underline"
                  style={{ color: "#0F4C3A" }}
                >
                  Voir tous les biens →
                </Link>
              </div>
            </section>
          )}

          {/* Bloc : Info abonnement / statut compte */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: "linear-gradient(135deg, #0F4C3A 0%, #146C43 100%)",
              boxShadow: "0 4px 20px rgba(15,76,58,0.25)",
            }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(255,255,255,0.15)" }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#D4AF37" strokeWidth="1.8">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: "#fff" }}>
              Compte vérifié
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
              Votre annonce sera examinée par notre équipe avant publication.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
