// Carte latérale « contact » d'une fiche bien (Propriétaire / Conseiller HOOMY).
// Server Component — les actions Appeler / Email sont de simples liens tel:/mailto:.

export type ProfilContact = {
  nom_complet: string | null;
  email: string | null;
  telephone: string | null;
  role?: string | null;
};

type Props = {
  titre: string;
  profil: ProfilContact | null;
  /** Message affiché quand aucun profil n'est rattaché */
  vide: string;
  /** Contenu additionnel (ex. formulaire d'affectation côté admin) */
  children?: React.ReactNode;
};

const LIBELLES_ROLE: Record<string, string> = {
  agent: "Agent HOOMY",
  agence: "Agence partenaire",
  admin: "Administrateur",
  client: "Client",
};

export default function CarteContactProfil({ titre, profil, vide, children }: Props) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid #F0EDE5" }}>
      <p className="text-xs font-semibold mb-4 uppercase tracking-wider" style={{ color: "#9DB8AD" }}>
        {titre}
      </p>

      {profil ? (
        <>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold"
              style={{ background: "#D4AF37", color: "#0F4C3A" }}
            >
              {(profil.nom_complet ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "#1f2a24" }}>
                {profil.nom_complet ?? "—"}
              </p>
              {profil.role && (
                <p className="text-xs" style={{ color: "#9DB8AD" }}>
                  {LIBELLES_ROLE[profil.role] ?? profil.role}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mb-4 text-sm" style={{ color: "#3D4A42" }}>
            {profil.email && (
              <span className="flex items-center gap-2 min-w-0">
                <svg className="flex-shrink-0" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#9DB8AD" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span className="truncate">{profil.email}</span>
              </span>
            )}
            {profil.telephone && (
              <span className="flex items-center gap-2">
                <svg className="flex-shrink-0" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#9DB8AD" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                {profil.telephone}
              </span>
            )}
            {!profil.email && !profil.telephone && (
              <span className="text-xs" style={{ color: "#C4D8CE" }}>Aucune coordonnée renseignée</span>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            {profil.telephone && (
              <a
                href={`tel:${profil.telephone.replace(/\s/g, "")}`}
                className="flex-1 text-center text-xs font-semibold px-3 py-2 rounded-xl hover:opacity-90 transition-opacity"
                style={{ background: "#0F4C3A", color: "#fff", textDecoration: "none" }}
              >
                Appeler
              </a>
            )}
            {profil.email && (
              <a
                href={`mailto:${profil.email}`}
                className="flex-1 text-center text-xs font-semibold px-3 py-2 rounded-xl hover:opacity-90 transition-opacity"
                style={{ background: "#fff", color: "#0F4C3A", border: "1px solid #C6E8D4", textDecoration: "none" }}
              >
                Envoyer un email
              </a>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm" style={{ color: "#C4D8CE" }}>{vide}</p>
      )}

      {children}
    </div>
  );
}
