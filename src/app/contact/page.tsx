import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { CONTACT, LIEN_WHATSAPP } from "@/lib/contact";

export const metadata = {
  title: "Contact | HOOMY.MA",
  description: "Contactez l'équipe HOOMY par téléphone, WhatsApp ou email. Nous sommes disponibles pour vous accompagner dans votre projet immobilier.",
};

// ── Icônes ──────────────────────────────────────────────────────────────────────

function IcTelephone() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.44 2 2 0 0 1 3.6 1.26h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6.06 6.06l.92-1.06a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IcWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 24, height: 24 }} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function IcEmail() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function IcHorloge() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// ── Carte de contact ─────────────────────────────────────────────────────────────

interface CarteContactProps {
  Icone: () => React.ReactElement;
  couleurIcone: string;
  fondIcone: string;
  titre: string;
  description: string;
  href: string;
  labelBouton: string;
  target?: string;
  rel?: string;
}

function CarteContact({ Icone, couleurIcone, fondIcone, titre, description, href, labelBouton, target, rel }: CarteContactProps) {
  return (
    <div
      className="flex flex-col items-center text-center p-8 rounded-2xl"
      style={{
        background: "var(--fond-secondaire)",
        border: "1px solid var(--bordure)",
        boxShadow: "0 2px 16px rgba(15,76,58,0.06)",
      }}
    >
      {/* Icône */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 flex-shrink-0"
        style={{ background: fondIcone, color: couleurIcone }}
      >
        <Icone />
      </div>

      {/* Titre */}
      <h2
        className="font-normal mb-2"
        style={{
          fontFamily: "var(--font-marcellus), serif",
          color: "var(--primaire)",
          fontSize: "1.2rem",
        }}
      >
        {titre}
      </h2>

      {/* Description */}
      <p
        className="text-sm mb-6 leading-relaxed"
        style={{ color: "var(--texte-secondaire)" }}
      >
        {description}
      </p>

      {/* Bouton / lien */}
      <a
        href={href}
        target={target}
        rel={rel}
        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-85 w-full"
        style={{
          background: "var(--primaire)",
          color: "var(--fond-secondaire)",
          textDecoration: "none",
        }}
      >
        {labelBouton}
      </a>
    </div>
  );
}

// ── Page principale ──────────────────────────────────────────────────────────────

export default function PageContact() {
  return (
    <main style={{ background: "var(--fond-principal)", minHeight: "100vh" }}>
      <Navbar />

      {/* ── Bannière hero ──────────────────────────────────────────────────── */}
      <section
        className="px-6 py-16 text-center"
        style={{
          background: "linear-gradient(145deg, #0A3528 0%, #0F4C3A 60%, #146C43 100%)",
        }}
      >
        <p
          className="text-xs tracking-widest mb-4"
          style={{ color: "var(--accent)", letterSpacing: "0.22em" }}
        >
          HOOMY.MA · CONTACT
        </p>
        <h1
          className="text-3xl md:text-4xl font-normal mb-4"
          style={{
            fontFamily: "var(--font-marcellus), serif",
            color: "var(--fond-secondaire)",
          }}
        >
          Contactez-nous
        </h1>
        <p className="text-sm max-w-md mx-auto" style={{ color: "#C9D5CF" }}>
          Notre équipe est disponible du lundi au samedi pour vous accompagner dans votre projet immobilier.
        </p>
      </section>

      {/* ── Cartes de contact ─────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Téléphone */}
          <CarteContact
            Icone={IcTelephone}
            couleurIcone="var(--primaire)"
            fondIcone="var(--fond-vert-leger, #ecf5f0)"
            titre="Téléphone"
            description={`Appelez-nous directement.\n${CONTACT.telephoneAffichage}`}
            href={CONTACT.telephoneLien}
            labelBouton={`Appeler ${CONTACT.telephoneAffichage}`}
          />

          {/* WhatsApp */}
          <CarteContact
            Icone={IcWhatsApp}
            couleurIcone="#25D366"
            fondIcone="#e8faf0"
            titre="WhatsApp"
            description="Réponse rapide garantie. Discutez avec un conseiller HOOMY via WhatsApp."
            href={LIEN_WHATSAPP}
            labelBouton="Discuter sur WhatsApp"
            target="_blank"
            rel="noopener noreferrer"
          />

          {/* Email */}
          <CarteContact
            Icone={IcEmail}
            couleurIcone="var(--accent)"
            fondIcone="rgba(212,175,55,0.1)"
            titre="Email"
            description={`Envoyez-nous vos questions par email.\n${CONTACT.email}`}
            href={CONTACT.emailLien}
            labelBouton={`Écrire à ${CONTACT.email}`}
          />
        </div>

        {/* ── Bloc horaires ──────────────────────────────────────────────── */}
        <div
          className="mt-10 flex items-start gap-4 p-6 rounded-2xl"
          style={{
            background: "var(--fond-secondaire)",
            border: "1px solid var(--bordure)",
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: "var(--fond-vert-leger, #ecf5f0)", color: "var(--primaire)" }}
          >
            <IcHorloge />
          </div>
          <div>
            <p
              className="text-sm font-semibold mb-1"
              style={{ color: "var(--texte-principal)", fontFamily: "var(--font-marcellus), serif" }}
            >
              Horaires de disponibilité
            </p>
            <p className="text-sm" style={{ color: "var(--texte-secondaire)", lineHeight: 1.7 }}>
              Lundi – Vendredi : 9h00 – 18h30<br />
              Samedi : 10h00 – 16h00<br />
              <span style={{ color: "var(--texte-tertiaire)" }}>
                WhatsApp disponible en dehors des horaires — réponse sous 24h.
              </span>
            </p>
          </div>
        </div>

        {/* ── Coordonnées texte lisibles (pour copier-coller) ─────────────── */}
        <div className="mt-8 text-center">
          <p className="text-xs" style={{ color: "var(--texte-tertiaire)" }}>
            Tél :&nbsp;
            <a
              href={CONTACT.telephoneLien}
              style={{ color: "var(--primaire)", textDecoration: "none", fontWeight: 600 }}
            >
              {CONTACT.telephoneAffichage}
            </a>
            &nbsp;·&nbsp;
            Email :&nbsp;
            <a
              href={CONTACT.emailLien}
              style={{ color: "var(--primaire)", textDecoration: "none", fontWeight: 600 }}
            >
              {CONTACT.email}
            </a>
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
