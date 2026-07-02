export type DonneesICS = {
  id: string;
  dateSouhaitee: string;     // YYYY-MM-DD
  titreBien: string;
  referenceBien: string | null;
  villeBien: string;
  quartierBien: string | null;
  slugBien: string | null;
  transactionBien: string;
  contactNom: string;
  contactTelephone: string | null;
};

function echapper(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}

function dateUtcValide(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T12:00:00Z");
  return !isNaN(d.getTime());
}

function icsDate(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

function icsDatePlusUn(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split("T")[0].replace(/-/g, "");
}

export function genererICS(d: DonneesICS): string {
  if (!dateUtcValide(d.dateSouhaitee)) {
    throw new Error(`Date invalide pour la visite ${d.id} : "${d.dateSouhaitee}"`);
  }

  const summary = d.referenceBien
    ? `Visite — ${d.titreBien} (${d.referenceBien})`
    : `Visite — ${d.titreBien}`;

  const location = d.quartierBien
    ? `${d.quartierBien}, ${d.villeBien}`
    : d.villeBien;

  const prefixe = d.transactionBien === "location" ? "louer" : "acheter";
  const lienFiche = d.slugBien
    ? `https://hoomy.ma/${prefixe}/${d.slugBien}`
    : "https://hoomy.ma";

  const contact = d.contactTelephone
    ? `${d.contactNom} — ${d.contactTelephone}`
    : d.contactNom;

  const description = `Voir l'annonce : ${lienFiche}\\nContact : ${contact}`;

  const lignes = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HOOMY.MA//Calendrier//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${d.id}@hoomy.ma`,
    `SUMMARY:${echapper(summary)}`,
    `DTSTART;VALUE=DATE:${icsDate(d.dateSouhaitee)}`,
    `DTEND;VALUE=DATE:${icsDatePlusUn(d.dateSouhaitee)}`,
    `LOCATION:${echapper(location)}`,
    `DESCRIPTION:${echapper(description)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-P1D",
    `DESCRIPTION:Rappel : ${echapper(summary)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lignes.join("\r\n") + "\r\n";
}
