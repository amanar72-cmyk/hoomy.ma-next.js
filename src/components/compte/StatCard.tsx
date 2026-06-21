export default function StatCard({
  icone,
  valeur,
  label,
  couleurIcone = "#0F4C3A",
  fondIcone = "#E8F5ED",
  placeholder = false,
}: {
  icone: React.ReactNode;
  valeur: number | string;
  label: string;
  couleurIcone?: string;
  fondIcone?: string;
  placeholder?: boolean;
}) {
  return (
    <div
      className="relative rounded-2xl p-5 flex items-start gap-4 overflow-hidden"
      style={{ background: "#fff", boxShadow: "0 2px 12px rgba(15,76,58,0.07)", border: "1px solid #F0EDE5" }}
    >
      <div
        className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
        style={{ background: fondIcone, color: couleurIcone }}
      >
        {icone}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold leading-tight" style={{ color: "#0F4C3A" }}>
          {placeholder ? "—" : valeur}
        </p>
        <p className="text-sm mt-0.5 truncate" style={{ color: "#9DB8AD" }}>
          {label}
        </p>
      </div>
      {placeholder && (
        <span
          className="absolute top-3 right-3 text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ background: "#F3F4F6", color: "#9CA3AF" }}
        >
          Bientôt
        </span>
      )}
    </div>
  );
}
