// Tableau stylé réutilisable — les lignes <tr> sont passées en enfants
type Props = {
  colonnes: string[];
  children: React.ReactNode;
  vide?: string;
  estVide?: boolean;
};

export default function TableauAdmin({
  colonnes,
  children,
  vide = "Aucune donnée",
  estVide = false,
}: Props) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid #E8E2D2", background: "#fff" }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#F9F7F2", borderBottom: "1px solid #E8E2D2" }}>
              {colonnes.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap"
                  style={{ color: "#9DB8AD" }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {estVide ? (
              <tr>
                <td
                  colSpan={colonnes.length}
                  className="px-4 py-10 text-center text-sm"
                  style={{ color: "#B4AD97" }}
                >
                  {vide}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
