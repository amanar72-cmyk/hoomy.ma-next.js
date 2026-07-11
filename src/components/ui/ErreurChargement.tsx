// Bandeau d'erreur de chargement (back-office) — affiché quand une requête
// Supabase échoue, au lieu de simuler silencieusement une liste vide.
// Server Component (aucune interactivité).

type Props = {
  titre?: string;
  detail?: string | null; // message technique (ex. erreur PostgREST)
};

export default function ErreurChargement({
  titre = "Impossible de charger les données",
  detail = null,
}: Props) {
  return (
    <div
      role="alert"
      className="rounded-2xl px-5 py-4 mb-4"
      style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
    >
      <p className="text-sm font-semibold" style={{ color: "#991B1B" }}>
        ⚠ {titre}
      </p>
      {detail && (
        <p className="text-xs mt-1 break-words" style={{ color: "#B45454", fontFamily: "monospace" }}>
          {detail}
        </p>
      )}
      <p className="text-xs mt-1.5" style={{ color: "#991B1B" }}>
        Rechargez la page ; si l&apos;erreur persiste, elle vient de la base (contrainte,
        colonne ou policy) — le détail ci-dessus indique quoi corriger.
      </p>
    </div>
  );
}
