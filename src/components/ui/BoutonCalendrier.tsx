// Bouton « Ajouter à mon calendrier » — Server Component (aucun état client)
// Visible uniquement sur les visites confirmées avec une date.

type Props = {
  visitId: string;
  date: string;         // YYYY-MM-DD
  titre: string;
  reference: string | null;
  location: string;     // ex: "Bourgogne, Casablanca"
  lienFiche: string;    // ex: "https://hoomy.ma/acheter/hm-1001-..."
};

function dateGoogleCalendar(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  const fin = new Date(d);
  fin.setUTCDate(fin.getUTCDate() + 1);
  const fmt = (dt: Date) => dt.toISOString().split("T")[0].replace(/-/g, "");
  return `${fmt(d)}/${fmt(fin)}`;
}

export default function BoutonCalendrier({
  visitId, date, titre, reference, location, lienFiche,
}: Props) {
  const summary = reference ? `Visite — ${titre} (${reference})` : `Visite — ${titre}`;
  const details = `Voir l'annonce : ${lienFiche}`;

  const lienGoogle =
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${encodeURIComponent(summary)}` +
    `&dates=${dateGoogleCalendar(date)}` +
    `&location=${encodeURIComponent(location)}` +
    `&details=${encodeURIComponent(details)}`;

  return (
    <div className="flex flex-col gap-1.5">
      {/* Bouton principal — télécharge le .ics (Apple Calendar / Outlook) */}
      <a
        href={`/api/calendrier/visite/${visitId}`}
        download
        className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl hover:opacity-90 transition-opacity"
        style={{ background: "#0F4C3A", color: "#fff", textDecoration: "none" }}
      >
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        Ajouter à mon calendrier
      </a>

      {/* Lien secondaire Google Agenda */}
      <a
        href={lienGoogle}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs hover:underline"
        style={{ color: "#9DB8AD", textDecoration: "none" }}
      >
        ou ajouter à Google Agenda →
      </a>
    </div>
  );
}
