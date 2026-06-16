// Carte statistique réutilisable pour le tableau de bord admin
type Props = {
  titre: string;
  valeur: string | number;
  icone: string;
  couleurAccent?: string;
  sousTitre?: string;
};

export default function CarteStat({
  titre,
  valeur,
  icone,
  couleurAccent = "#0F4C3A",
  sousTitre,
}: Props) {
  return (
    <div
      className="rounded-2xl p-5 flex items-start gap-4"
      style={{ background: "#fff", border: "1px solid #E8E2D2" }}
    >
      {/* Icône avec fond teinté */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: `${couleurAccent}1A` }}
      >
        {icone}
      </div>
      <div className="min-w-0">
        <p className="text-xs mb-1 uppercase tracking-wide" style={{ color: "#9DB8AD" }}>
          {titre}
        </p>
        <p className="text-2xl font-semibold leading-none" style={{ color: couleurAccent }}>
          {valeur}
        </p>
        {sousTitre && (
          <p className="text-xs mt-1.5" style={{ color: "#B4AD97" }}>
            {sousTitre}
          </p>
        )}
      </div>
    </div>
  );
}
