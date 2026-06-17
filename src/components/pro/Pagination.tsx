// Pagination URL-based — génère des liens avec le paramètre ?page=N
import Link from "next/link";

type Props = {
  page: number;
  total: number;
  parPage: number;
  baseUrl: string; // ex: "/pro/biens?ville=Casablanca"
};

export default function Pagination({ page, total, parPage, baseUrl }: Props) {
  const totalPages = Math.ceil(total / parPage);
  if (totalPages <= 1) return null;

  function href(p: number) {
    const sep = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${sep}page=${p}`;
  }

  const pages: number[] = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-8 pb-2">
      {page > 1 && (
        <Link href={href(page - 1)}
          className="px-3 py-1.5 rounded-lg text-sm border"
          style={{ borderColor: "#E0DAC8", color: "#0F4C3A" }}>
          ‹
        </Link>
      )}
      {pages[0] > 1 && (
        <>
          <Link href={href(1)} className="px-3 py-1.5 rounded-lg text-sm border"
            style={{ borderColor: "#E0DAC8", color: "#0F4C3A" }}>1</Link>
          {pages[0] > 2 && <span className="px-1 text-sm" style={{ color: "#9DB8AD" }}>…</span>}
        </>
      )}
      {pages.map((p) => (
        <Link key={p} href={href(p)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium border"
          style={p === page
            ? { background: "#0F4C3A", color: "#fff", borderColor: "#0F4C3A" }
            : { borderColor: "#E0DAC8", color: "#0F4C3A" }
          }>
          {p}
        </Link>
      ))}
      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && (
            <span className="px-1 text-sm" style={{ color: "#9DB8AD" }}>…</span>
          )}
          <Link href={href(totalPages)} className="px-3 py-1.5 rounded-lg text-sm border"
            style={{ borderColor: "#E0DAC8", color: "#0F4C3A" }}>{totalPages}</Link>
        </>
      )}
      {page < totalPages && (
        <Link href={href(page + 1)}
          className="px-3 py-1.5 rounded-lg text-sm border"
          style={{ borderColor: "#E0DAC8", color: "#0F4C3A" }}>
          ›
        </Link>
      )}
      <span className="ml-2 text-xs" style={{ color: "#9DB8AD" }}>
        Page {page} / {totalPages} · {total} résultat{total > 1 ? "s" : ""}
      </span>
    </div>
  );
}
