import type { Metadata, Viewport } from "next";

// URL du binaire. Surchargeable sans redéploiement de code : à chaque nouvelle
// version, il suffit de déposer le fichier et de mettre à jour la variable.
const URL_APK =
  process.env.NEXT_PUBLIC_URL_APK ??
  "https://lknclszligkdlwhhhcqn.supabase.co/storage/v1/object/public/applications/hoomy-pro-1.0.apk";

const VERSION = "1.0";
const TAILLE = "7,6 Mo";
const EMPREINTE = "79ac38365d7424eb614efbfb586a235d1cd6924693ccf4502a0809ba45c27d20";

export const metadata: Metadata = {
  title: "Télécharger HOOMY PRO",
  description:
    "Application Android HOOMY PRO — réservée aux agents et administrateurs HOOMY.MA.",
  // Outil interne : aucune raison d'apparaître dans les résultats de recherche.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const ETAPES = [
  {
    titre: "Lancez le téléchargement",
    detail:
      "Chrome affiche « Ce type de fichier peut endommager votre appareil » : choisissez Télécharger quand même.",
  },
  {
    titre: "Ouvrez le fichier téléchargé",
    detail:
      "Android demande alors d'autoriser Chrome à installer des applications. Activez l'autorisation, puis revenez en arrière.",
  },
  {
    titre: "Passez l'avertissement Play Protect",
    detail:
      "« Application non reconnue » apparaît car l'app ne vient pas du Play Store. Choisissez Installer quand même.",
  },
  {
    titre: "Connectez-vous",
    detail:
      "Avec vos identifiants HOOMY habituels. L'app est réservée aux agents et administrateurs.",
  },
];

export default function PageTelecharger() {
  return (
    <main
      className="min-h-screen px-5 py-12 md:py-16"
      style={{ background: "var(--fond-principal)" }}
    >
      <div className="mx-auto flex flex-col gap-10" style={{ maxWidth: 560 }}>

        {/* ── Identité ─────────────────────────────────────────────────── */}
        <header className="flex flex-col items-center gap-4 text-center">
          {/* Icône générée par la route /icons/pro-192 — même visuel que l'app */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/pro-192"
            alt=""
            width={88}
            height={88}
            style={{ borderRadius: 20, border: "1px solid var(--bordure)" }}
          />
          <div className="flex flex-col gap-1.5">
            <h1
              className="text-3xl"
              style={{ fontFamily: "var(--font-marcellus),serif", color: "var(--texte-principal)" }}
            >
              HOOMY PRO
            </h1>
            <p className="text-sm" style={{ color: "var(--texte-secondaire)" }}>
              Application Android · Version {VERSION} · {TAILLE}
            </p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--texte-corps)" }}>
            Vos biens, vos leads et vos visites sur votre téléphone, avec les
            notifications en temps réel.
          </p>
        </header>

        {/* ── Téléchargement ───────────────────────────────────────────── */}
        <a
          href={URL_APK}
          download
          className="flex items-center justify-center gap-2.5 rounded-xl px-6 py-4 text-base font-semibold transition-opacity hover:opacity-90"
          style={{ background: "var(--primaire)", color: "#FAF7F0", textDecoration: "none" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Télécharger l&apos;application
        </a>

        {/* ── Installation ─────────────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--texte-principal)" }}
          >
            Installation, la première fois
          </h2>
          <p className="text-sm" style={{ color: "var(--texte-secondaire)" }}>
            Android protège votre téléphone en bloquant les applications qui ne
            viennent pas du Play Store. Ces quatre étapes ne sont à faire qu&apos;une
            seule fois.
          </p>

          <ol className="flex flex-col gap-3.5" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {ETAPES.map((etape, i) => (
              <li key={etape.titre} className="flex gap-3.5">
                <span
                  className="flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    width: 26,
                    height: 26,
                    background: "var(--accent)",
                    color: "var(--texte-principal)",
                  }}
                >
                  {i + 1}
                </span>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-semibold" style={{ color: "var(--texte-principal)" }}>
                    {etape.titre}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--texte-corps)" }}>
                    {etape.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Vérification ─────────────────────────────────────────────── */}
        <section
          className="rounded-xl p-4 flex flex-col gap-2"
          style={{ background: "var(--fond-secondaire)", border: "1px solid var(--bordure)" }}
        >
          <p className="text-xs font-semibold" style={{ color: "var(--texte-principal)" }}>
            Empreinte SHA-256
          </p>
          <p
            className="text-xs"
            style={{
              color: "var(--texte-secondaire)",
              fontFamily: "ui-monospace, monospace",
              wordBreak: "break-all",
              lineHeight: 1.7,
            }}
          >
            {EMPREINTE}
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--texte-secondaire)" }}>
            Elle permet de vérifier que le fichier téléchargé est bien celui
            publié par HOOMY, et non une copie modifiée.
          </p>
        </section>

        <footer className="text-center">
          <p className="text-xs" style={{ color: "var(--texte-secondaire)" }}>
            Un iPhone ? L&apos;application iOS n&apos;est pas encore disponible — en
            attendant, ouvrez{" "}
            <a href="https://pro.hoomy.ma" style={{ color: "var(--primaire)" }}>
              pro.hoomy.ma
            </a>{" "}
            dans Safari.
          </p>
        </footer>
      </div>
    </main>
  );
}
