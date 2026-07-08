// Section « Un projet immobilier ? » — accueil, avant le footer.
// Server Component : seul le formulaire (client) est interactif.

import FormulaireLead from "@/components/leads/FormulaireLead";

export default function SectionLead() {
  return (
    <section id="contact-conseiller" className="max-w-6xl mx-auto px-6 py-16 scroll-mt-20">
      <div
        className="rounded-3xl overflow-hidden lg:grid lg:grid-cols-2"
        style={{ background: "var(--fond-secondaire)", border: "1px solid #EDE7D7", boxShadow: "0 8px 40px rgba(15,76,58,0.08)" }}
      >
        {/* Volet éditorial */}
        <div
          className="px-8 py-10 lg:py-14 flex flex-col justify-center"
          style={{ background: "linear-gradient(150deg, #0F4C3A 0%, #146C43 100%)" }}
        >
          <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: "#D4AF37" }}>
            Parlez-nous de votre projet
          </p>
          <h2
            className="text-2xl lg:text-3xl font-normal mb-4 leading-snug"
            style={{ fontFamily: "var(--font-marcellus), serif", color: "#fff" }}
          >
            Un projet immobilier&nbsp;?
            <br />
            On s&apos;occupe de tout.
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "#A8D5B8" }}>
            Achat, location ou vente : répondez à quelques questions et un
            conseiller dédié vous rappelle sous 24 h avec une sélection adaptée.
          </p>
          <div className="flex items-center gap-2 mt-6">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#D4AF37" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <p className="text-xs font-medium" style={{ color: "#D4AF37" }}>
              Gratuit et sans engagement
            </p>
          </div>
        </div>

        {/* Formulaire */}
        <div className="px-6 sm:px-8 py-8">
          <FormulaireLead source="accueil" />
        </div>
      </div>
    </section>
  );
}
