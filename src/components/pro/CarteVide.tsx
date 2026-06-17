// État "aucun résultat" pour les listes Pro

type Props = {
  message?: string;
  sousTitre?: string;
  icone?: string;
};

export default function CarteVide({
  message = "Aucun résultat",
  sousTitre = "Aucun élément ne correspond à votre recherche.",
  icone = "🔍",
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-5 opacity-60">{icone}</div>
      <p className="text-base font-medium mb-2" style={{ color: "#3D4A42" }}>{message}</p>
      <p className="text-sm" style={{ color: "#9DB8AD" }}>{sousTitre}</p>
    </div>
  );
}
