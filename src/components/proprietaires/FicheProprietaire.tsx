import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FormulaireProprietaire from "@/components/proprietaires/FormulaireProprietaire";

// Fiche propriétaire (vendeur) — Server Component PARTAGÉ admin/pro.
// Infos + formulaire de modification + biens rattachés (vendeur_id) +
// bouton « Ajouter un bien » (pré-remplit le propriétaire à l'étape C via
// ?vendeur=<id> sur le formulaire de création existant).

type Props = {
  base: "/admin" | "/pro";
  id: string;
};

const FORMAT_PRIX = new Intl.NumberFormat("fr-MA");

export default async function FicheProprietaire({ base, id }: Props) {
  const supabase = await createClient();

  const { data: proprietaire } = await supabase
    .from("proprietaires")
    .select("id, nom, prenom, telephone, email, notes, cree_le, maj_le")
    .eq("id", id)
    .maybeSingle();

  if (!proprietaire) notFound();

  const { data: biens, error: erreurBiens } = await supabase
    .from("biens")
    .select("id, reference, titre, type, transaction, prix, ville, statut, cree_le")
    .eq("vendeur_id", id)
    .order("cree_le", { ascending: false });

  const nomComplet = [proprietaire.prenom, proprietaire.nom].filter(Boolean).join(" ");

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <Link
        href={`${base}/proprietaires`}
        className="text-sm hover:underline"
        style={{ color: "#9DB8AD" }}
      >
        ← Retour au répertoire
      </Link>

      <div className="mt-4 mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl mb-1"
            style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}
          >
            {nomComplet}
          </h1>
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            Propriétaire (vendeur) · fiche créée le{" "}
            {new Date(proprietaire.cree_le).toLocaleDateString("fr-MA")}
          </p>
        </div>
        <Link
          href={`${base}/biens/nouveau?vendeur=${proprietaire.id}`}
          className="px-5 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: "#D4AF37", color: "#0F4C3A" }}
        >
          + Ajouter un bien
        </Link>
      </div>

      {/* Coordonnées + notes (modification en place) */}
      <section
        className="rounded-2xl p-6 mb-8"
        style={{ border: "1px solid #EBEBEB", background: "#fff" }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "#0F4C3A" }}>
          Coordonnées & notes
        </h2>
        <FormulaireProprietaire
          base={base}
          initial={{
            id: proprietaire.id,
            nom: proprietaire.nom,
            prenom: proprietaire.prenom,
            telephone: proprietaire.telephone,
            email: proprietaire.email,
            notes: proprietaire.notes,
          }}
        />
      </section>

      {/* Biens rattachés */}
      <section
        className="rounded-2xl p-6"
        style={{ border: "1px solid #EBEBEB", background: "#fff" }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "#0F4C3A" }}>
          Biens de ce propriétaire ({(biens ?? []).length})
        </h2>

        {erreurBiens && (
          <div
            className="rounded-xl px-4 py-3 text-sm mb-4"
            style={{ background: "#FDF3F2", color: "#B3412F", border: "1px solid #F2D6D1" }}
          >
            Chargement des biens impossible : {erreurBiens.message}
          </div>
        )}

        {(biens ?? []).length === 0 && !erreurBiens ? (
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            Aucun bien rattaché pour l&apos;instant — utilisez « Ajouter un bien » ci-dessus.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "#F0EDE5" }}>
            {(biens ?? []).map((b) => (
              <li key={b.id}>
                <Link
                  href={`${base}/biens/${b.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 group"
                >
                  <div className="min-w-0">
                    <p
                      className="text-sm font-medium group-hover:underline truncate"
                      style={{ color: "#3D4A42" }}
                    >
                      {b.titre}
                    </p>
                    <p className="text-xs" style={{ color: "#9DB8AD" }}>
                      {b.reference} · {b.type} · {b.ville}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-medium" style={{ color: "#0F4C3A" }}>
                      {FORMAT_PRIX.format(b.prix)} DH
                      {b.transaction === "location" ? "/mois" : ""}
                    </span>
                    <span
                      className="text-xs px-2.5 py-1 rounded-full capitalize"
                      style={{ background: "#F4F6F5", color: "#6B7A71" }}
                    >
                      {(b.statut ?? "—").replace(/_/g, " ")}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
