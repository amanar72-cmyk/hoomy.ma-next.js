"use client";

// Formulaire de qualification de lead — réutilisable, mobile-first.
// Deux temps sur un même écran fluide : le projet (choix rapides en pills),
// puis le contact. Le score est calculé PAR LA BASE : on n'envoie que les
// réponses. Anti-spam : honeypot + horodatage d'affichage (validés serveur).

import { useMemo, useState } from "react";
import { sendGAEvent } from "@next/third-parties/google";
import { soumettreLead, type DonneesLead } from "@/app/leads/actions";
import { trackMeta } from "@/lib/meta/pixel";
import { afficherToast } from "@/components/ui/Toaster";

// ── Options (libellés courts, valeurs = CHECK en base) ───────────────────────

const PROJETS = [
  { valeur: "achat",    libelle: "Acheter" },
  { valeur: "location", libelle: "Louer" },
  { valeur: "vente",    libelle: "Vendre mon bien" },
] as const;

const BUDGETS_ACHAT = [
  { valeur: "<500k",   libelle: "Moins de 500 000 DH" },
  { valeur: "500k-1M", libelle: "500k – 1M DH" },
  { valeur: "1-2M",    libelle: "1 – 2M DH" },
  { valeur: "2M+",     libelle: "Plus de 2M DH" },
] as const;

const BUDGETS_LOCATION = [
  { valeur: "<3k/mois",   libelle: "Moins de 3 000 DH" },
  { valeur: "3-6k/mois",  libelle: "3 000 – 6 000 DH" },
  { valeur: "6-10k/mois", libelle: "6 000 – 10 000 DH" },
  { valeur: "10k+/mois",  libelle: "Plus de 10 000 DH" },
] as const;

const FINANCEMENTS = [
  { valeur: "cash",            libelle: "Cash" },
  { valeur: "credit_accord",   libelle: "Crédit accordé" },
  { valeur: "credit_a_monter", libelle: "Crédit à monter" },
  { valeur: "a_definir",       libelle: "À définir" },
] as const;

const DELAIS = [
  { valeur: "moins_3_mois",   libelle: "Moins de 3 mois" },
  { valeur: "entre_3_6_mois", libelle: "3 à 6 mois" },
  { valeur: "plus_6_mois",    libelle: "Plus de 6 mois" },
] as const;

const PROFILS = [
  { valeur: "local", libelle: "Résident au Maroc" },
  { valeur: "mre",   libelle: "MRE (à l'étranger)" },
] as const;

const VILLES = ["Casablanca", "Marrakech", "Rabat", "Tanger", "Agadir", "Fès"];

// ── Sous-composants ───────────────────────────────────────────────────────────

function Question({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-sm font-medium mb-2.5" style={{ color: "#3D4A42" }}>{titre}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Pill({
  actif, onClick, children,
}: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3.5 py-2 rounded-full text-sm border transition-all cursor-pointer"
      style={
        actif
          ? { background: "#0F4C3A", borderColor: "#0F4C3A", color: "#fff", fontWeight: 600 }
          : { background: "var(--fond-secondaire, #fff)", borderColor: "#E0DAC8", color: "#3D4A42" }
      }
    >
      {children}
    </button>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

type Props = {
  source: string;                       // fiche_bien | accueil | estimation…
  bienId?: string | null;               // renseigné depuis une fiche
  titreBien?: string | null;            // pour l'email de notification
  reference?: string | null;            // HM-XXXX — content_ids du Pixel Lead
  typeProjetInitial?: "achat" | "location" | "vente";
  onSucces?: () => void;                // ex. fermer le modal
};

export default function FormulaireLead({
  source, bienId = null, titreBien = null, reference = null, typeProjetInitial, onSucces,
}: Props) {
  // Horodatage d'affichage — validé côté serveur (soumission < 3 s = bot)
  const [afficheA] = useState(() => Date.now());

  // Temps 1 — le projet
  const [typeProjet, setTypeProjet] = useState<string>(typeProjetInitial ?? "");
  const [budget, setBudget] = useState<string>("");
  const [financement, setFinancement] = useState<string>("");
  const [delai, setDelai] = useState<string>("");
  const [profil, setProfil] = useState<string>("");
  const [zonesVilles, setZonesVilles] = useState<string[]>([]);
  const [zoneLibre, setZoneLibre] = useState("");

  // Temps 2 — le contact
  const [etape, setEtape] = useState<1 | 2>(1);
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [siteWeb, setSiteWeb] = useState(""); // honeypot

  const [enEnvoi, setEnEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const estVente = typeProjet === "vente";
  const budgets = useMemo(
    () => (typeProjet === "location" ? BUDGETS_LOCATION : BUDGETS_ACHAT),
    [typeProjet]
  );

  const etape1Complete = typeProjet !== "" && delai !== "";

  function toggleVille(v: string) {
    setZonesVilles((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : prev.length < 5 ? [...prev, v] : prev
    );
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (enEnvoi) return;
    setErreur(null);
    setEnEnvoi(true);

    const zones = [...zonesVilles];
    const libre = zoneLibre.trim();
    if (libre) zones.push(libre);

    const donnees: DonneesLead = {
      typeProjet,
      budget: estVente ? null : budget || null,
      financement: typeProjet === "achat" ? financement || null : null,
      delai: delai || null,
      profilClient: profil || null,
      zones,
      nom,
      telephone,
      email: email || null,
      message: message || null,
      source,
      bienId,
      titreBien,
      afficheA,
      siteWeb,
    };

    try {
      const resultat = await soumettreLead(donnees);
      // Succès UI dans tous les cas (le bot/double-clic voit « envoyé »)…
      setEnvoye(true);
      afficherToast("Merci ! Un conseiller vous contacte très vite");
      // …mais tracking UNIQUEMENT sur un vrai lead (ni honeypot, ni bot, ni
      // doublon) : resultat.ok distingue les fausses réussites silencieuses.
      if (resultat.ok) {
        sendGAEvent("event", "lead_submit", { source, type_projet: typeProjet });
        // Pixel Lead — consent-gated (window.fbq n'existe qu'après acceptation).
        // content_ids = référence HM-XXXX si le lead porte sur un bien précis.
        trackMeta("Lead", reference ? { content_ids: [reference], content_type: "home_listing" } : undefined);
      }
      onSucces?.();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Une erreur est survenue. Réessayez.");
    } finally {
      setEnEnvoi(false);
    }
  }

  // ── État succès ─────────────────────────────────────────────────────────────
  if (envoye) {
    return (
      <div className="flex flex-col items-center text-center py-10 px-6">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{ background: "#E8F5ED" }}
        >
          <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="#0F4C3A" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p
          className="text-lg font-normal mb-1.5"
          style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}
        >
          Demande bien reçue
        </p>
        <p className="text-sm max-w-xs" style={{ color: "#6B7A71" }}>
          Un conseiller HOOMY vous contacte très vite pour parler de votre projet.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={envoyer}>
      {/* Honeypot — invisible pour les humains, rempli par les bots */}
      <input
        type="text"
        name="site_web"
        value={siteWeb}
        onChange={(e) => setSiteWeb(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />

      {/* Indicateur d'étape */}
      <div className="flex items-center gap-2 mb-5">
        {[1, 2].map((n) => (
          <div
            key={n}
            className="h-1 rounded-full flex-1 transition-colors"
            style={{ background: etape >= n ? "#D4AF37" : "#EDE7D7" }}
          />
        ))}
      </div>

      {/* ── Temps 1 : le projet ─────────────────────────────────────────── */}
      {etape === 1 && (
        <div>
          <Question titre="Votre projet">
            {PROJETS.map((p) => (
              <Pill key={p.valeur} actif={typeProjet === p.valeur}
                onClick={() => { setTypeProjet(p.valeur); setBudget(""); setFinancement(""); }}>
                {p.libelle}
              </Pill>
            ))}
          </Question>

          {typeProjet && !estVente && (
            <Question titre="Votre budget">
              {budgets.map((b) => (
                <Pill key={b.valeur} actif={budget === b.valeur} onClick={() => setBudget(b.valeur)}>
                  {b.libelle}
                </Pill>
              ))}
            </Question>
          )}

          {typeProjet === "achat" && (
            <Question titre="Financement">
              {FINANCEMENTS.map((f) => (
                <Pill key={f.valeur} actif={financement === f.valeur} onClick={() => setFinancement(f.valeur)}>
                  {f.libelle}
                </Pill>
              ))}
            </Question>
          )}

          <Question titre="Votre délai">
            {DELAIS.map((d) => (
              <Pill key={d.valeur} actif={delai === d.valeur} onClick={() => setDelai(d.valeur)}>
                {d.libelle}
              </Pill>
            ))}
          </Question>

          <Question titre="Vous êtes">
            {PROFILS.map((p) => (
              <Pill key={p.valeur} actif={profil === p.valeur} onClick={() => setProfil(p.valeur)}>
                {p.libelle}
              </Pill>
            ))}
          </Question>

          <Question titre={estVente ? "Ville du bien" : "Zones recherchées"}>
            {VILLES.map((v) => (
              <Pill key={v} actif={zonesVilles.includes(v)} onClick={() => toggleVille(v)}>
                {v}
              </Pill>
            ))}
          </Question>
          <input
            type="text"
            value={zoneLibre}
            onChange={(e) => setZoneLibre(e.target.value)}
            maxLength={60}
            placeholder={estVente ? "Quartier du bien (optionnel)" : "Autre ville ou quartier (optionnel)"}
            className="w-full border rounded-xl px-4 py-3 text-sm mb-5"
            style={{ borderColor: "#E0DAC8", color: "#1f2a24", background: "var(--fond-secondaire, #fff)" }}
          />

          <button
            type="button"
            disabled={!etape1Complete}
            onClick={() => setEtape(2)}
            className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 hover:shadow-md"
            style={{ background: "#0F4C3A", color: "#fff" }}
          >
            Continuer →
          </button>
          {!etape1Complete && (
            <p className="text-xs text-center mt-2" style={{ color: "#9DB8AD" }}>
              Indiquez au moins votre projet et votre délai
            </p>
          )}
        </div>
      )}

      {/* ── Temps 2 : le contact ────────────────────────────────────────── */}
      {etape === 2 && (
        <div>
          <div className="mb-5">
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#3D4A42" }}>
              Votre nom *
            </label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              maxLength={100}
              placeholder="Ex : Karim Alaoui"
              className="w-full border rounded-xl px-4 py-3 text-sm"
              style={{ borderColor: "#E0DAC8", color: "#1f2a24", background: "var(--fond-secondaire, #fff)" }}
            />
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#3D4A42" }}>
              Votre téléphone *
            </label>
            <input
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              required
              placeholder="Ex : 06 12 34 56 78"
              className="w-full border rounded-xl px-4 py-3 text-sm"
              style={{ borderColor: "#E0DAC8", color: "#1f2a24", background: "var(--fond-secondaire, #fff)" }}
            />
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#3D4A42" }}>
              Email <span className="font-normal" style={{ color: "#9DB8AD" }}>(optionnel)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              className="w-full border rounded-xl px-4 py-3 text-sm"
              style={{ borderColor: "#E0DAC8", color: "#1f2a24", background: "var(--fond-secondaire, #fff)" }}
            />
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#3D4A42" }}>
              Message <span className="font-normal" style={{ color: "#9DB8AD" }}>(optionnel)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Précisez votre projet si vous le souhaitez…"
              className="w-full border rounded-xl px-4 py-3 text-sm"
              style={{ borderColor: "#E0DAC8", color: "#1f2a24", background: "var(--fond-secondaire, #fff)", resize: "vertical" }}
            />
          </div>

          {erreur && (
            <div className="rounded-xl px-4 py-3 text-sm mb-4" style={{ background: "#FEE2E2", color: "#991B1B" }}>
              {erreur}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setEtape(1)}
              className="px-5 py-3.5 rounded-xl text-sm font-medium border cursor-pointer transition-colors"
              style={{ borderColor: "#E0DAC8", color: "#6B7A71", background: "transparent" }}
            >
              ← Retour
            </button>
            <button
              type="submit"
              disabled={enEnvoi}
              className="cta-halo flex-1 py-3.5 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-60"
              style={{ background: "#0F4C3A", color: "#fff" }}
            >
              {enEnvoi ? "Envoi en cours…" : "Être rappelé(e)"}
            </button>
          </div>
          <p className="text-xs text-center mt-3" style={{ color: "#9DB8AD" }}>
            Réponse sous 24 h · Vos coordonnées restent confidentielles
          </p>
        </div>
      )}
    </form>
  );
}
