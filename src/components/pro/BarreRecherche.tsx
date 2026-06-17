// Barre de recherche stylisée — utilisée dans des <form method="get">

type Props = {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
};

export default function BarreRecherche({
  name = "q",
  defaultValue = "",
  placeholder = "Rechercher…",
}: Props) {
  return (
    <div className="relative flex-1 min-w-[180px]">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        width="16" height="16" fill="none" viewBox="0 0 24 24"
        stroke="#9DB8AD" strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2"
        style={{ borderColor: "#E0DAC8", color: "#0F4C3A", background: "#fff" }}
      />
    </div>
  );
}
