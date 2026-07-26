"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { programmerRappel, marquerRappelFait, annulerRappel } from "@/lib/leads/rappels";
import { afficherToast } from "@/components/ui/Toaster";

// Programmation d'un rappel sur un lead — partagé /admin/leads et /pro/leads.
// Replié par défaut : la liste des leads est déjà dense, le formulaire ne
// s'ouvre qu'à la demande.

type Props = {
  leadId: string;
  dateRappel: string | null;
  rappelNote: string | null;
  rappelFaitLe: string | null;
};

/** Raccourcis : demain 10h, cet après-midi 14h… évite de saisir à la main. */
function raccourcis(): { label: string; date: Date }[] {
  const dans = (heures: number) => new Date(Date.now() + heures * 3600_000);
  const aJour = (joursPlus: number, h: number) => {
    const d = new Date();
    d.setDate(d.getDate() + joursPlus);
    d.setHours(h, 0, 0, 0);
    return d;
  };
  return [
    { label: "Dans 1 h", date: dans(1) },
    { label: "Demain 10h", date: aJour(1, 10) },
    { label: "Demain 15h", date: aJour(1, 15) },
    { label: "Dans 3 jours", date: aJour(3, 10) },
  ];
}

/** Date → "YYYY-MM-DDTHH:mm" en heure LOCALE (toISOString convertit en UTC). */
function versInputLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function formaterRappel(iso: string): string {
  return new Date(iso).toLocaleString("fr-MA", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default function RappelLead({ leadId, dateRappel, rappelNote, rappelFaitLe }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [ouvert, setOuvert] = useState(false);
  const [quand, setQuand] = useState(() => versInputLocal(raccourcis()[1].date));
  const [note, setNote] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  const enAttente = dateRappel && !rappelFaitLe;

  // « En retard » dépend de l'heure courante : le calculer pendant le rendu
  // donnerait un résultat potentiellement différent côté serveur et côté
  // navigateur (désynchronisation d'hydratation). On l'évalue après montage.
  const [enRetard, setEnRetard] = useState(false);
  useEffect(() => {
    if (!dateRappel || rappelFaitLe) { return; }
    const raf = requestAnimationFrame(() =>
      setEnRetard(new Date(dateRappel).getTime() < Date.now())
    );
    return () => cancelAnimationFrame(raf);
  }, [dateRappel, rappelFaitLe]);

  function agir(fn: () => Promise<void>, message: string) {
    setErreur(null);
    startTransition(async () => {
      try {
        await fn();
        afficherToast(message);
        setOuvert(false);
        router.refresh();
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  function enregistrer() {
    if (!quand) { setErreur("Choisissez une date et une heure."); return; }
    // L'input datetime-local rend une heure locale sans fuseau : `new Date()`
    // l'interprète bien en local, puis l'action la normalise en ISO/UTC.
    agir(() => programmerRappel(leadId, new Date(quand).toISOString(), note), "Rappel programmé");
  }

  // ── Rappel déjà programmé : pastille + actions ──
  if (enAttente && !ouvert) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
          style={enRetard
            ? { background: "#FEE2E2", color: "#991B1B" }
            : { background: "#FEF3C7", color: "#92400E" }}
          title={rappelNote ?? undefined}
        >
          {enRetard ? "⏰ En retard — " : "📞 Rappel "}{formaterRappel(dateRappel)}
        </span>
        <button
          type="button"
          onClick={() => agir(() => marquerRappelFait(leadId), "Rappel marqué fait")}
          disabled={pending}
          className="text-xs px-2 py-1 rounded-lg cursor-pointer disabled:opacity-60"
          style={{ background: "#D1FAE5", color: "#065F46" }}
        >
          Fait
        </button>
        <button
          type="button"
          onClick={() => setOuvert(true)}
          className="text-xs px-2 py-1 rounded-lg cursor-pointer"
          style={{ background: "#F4F6F5", color: "#6B7A71" }}
        >
          Modifier
        </button>
        <button
          type="button"
          onClick={() => agir(() => annulerRappel(leadId), "Rappel annulé")}
          disabled={pending}
          className="text-xs px-2 py-1 rounded-lg cursor-pointer disabled:opacity-60"
          style={{ background: "#fff", color: "#991B1B", border: "1px solid #FECACA" }}
        >
          Annuler
        </button>
      </div>
    );
  }

  // ── Aucun rappel : bouton discret ──
  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="text-xs px-2.5 py-1 rounded-lg cursor-pointer whitespace-nowrap"
        style={{ background: "#F4F6F5", color: "#0F4C3A", border: "1px solid #E0DAC8" }}
      >
        📞 Programmer un rappel
      </button>
    );
  }

  // ── Formulaire ──
  return (
    <div className="rounded-xl p-3 w-full max-w-md" style={{ background: "#FAF8F2", border: "1px solid #E0DAC8" }}>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {raccourcis().map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => setQuand(versInputLocal(r.date))}
            className="text-xs px-2 py-1 rounded-lg cursor-pointer"
            style={{ background: "#fff", color: "#0F4C3A", border: "1px solid #E0DAC8" }}
          >
            {r.label}
          </button>
        ))}
      </div>

      <input
        type="datetime-local"
        value={quand}
        onChange={(e) => setQuand(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm mb-2"
        style={{ borderColor: "#E0DAC8", color: "#1f2a24", background: "#fff" }}
      />
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Précision (ex : préfère l'après-midi)"
        maxLength={500}
        className="w-full border rounded-lg px-3 py-2 text-sm mb-2"
        style={{ borderColor: "#E0DAC8", color: "#1f2a24", background: "#fff" }}
      />

      {erreur && (
        <p className="text-xs mb-2" style={{ color: "#B3412F" }}>{erreur}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={enregistrer}
          disabled={pending}
          className="text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-60"
          style={{ background: "#0F4C3A", color: "#fff" }}
        >
          {pending ? "…" : "Programmer"}
        </button>
        <button
          type="button"
          onClick={() => { setOuvert(false); setErreur(null); }}
          className="text-xs px-3 py-1.5 rounded-lg cursor-pointer"
          style={{ background: "#fff", color: "#6B7A71", border: "1px solid #E0DAC8" }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
