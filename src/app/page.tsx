import { supabase } from "@/lib/supabase";
import { cheminBien } from "@/lib/url";
import Logo from "@/components/Logo";
import Link from "next/link";

export const dynamic = "force-dynamic";

const VERT = "#0F4C3A";
const EMERAUDE = "#146C43";
const OR = "#D4AF37";
const PHOTO = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80";

export default async function Accueil() {
  const { data: biens } = await supabase.from("biens").select("*").order("cree_le", { ascending: false });

  return (
    <main style={{ background: "#FAF7F0" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 28px", background: "#fff", borderBottom: "1px solid #E8E2D2", flexWrap: "wrap", gap: 12 }}>
        <Logo />
        <nav style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 14, color: "#3D4A42" }}>
          <span>Acheter</span>
          <span>Louer</span>
          <span>Vendre</span>
          <span style={{ color: EMERAUDE }}>Estimer</span>
          <span style={{ border: "1px solid #DCD3BC", padding: "6px 10px", borderRadius: 7, color: VERT }}>Français ▾</span>
          <span style={{ background: VERT, color: "#fff", padding: "7px 15px", borderRadius: 6 }}>Se connecter</span>
        </nav>
      </header>

      <section style={{ position: "relative", padding: "70px 24px", textAlign: "center", backgroundImage: `linear-gradient(rgba(15,76,58,0.80), rgba(15,76,58,0.62)), url(${PHOTO})`, backgroundSize: "cover", backgroundPosition: "center" }}>
        <p style={{ color: OR, fontSize: 12, letterSpacing: 3, margin: "0 0 12px" }}>IMMOBILIER PREMIUM · MAROC</p>
        <h1 style={{ fontFamily: "var(--font-marcellus), serif", color: "#fff", fontSize: 40, fontWeight: 400, margin: "0 0 10px", lineHeight: 1.2 }}>
          Trouvez le bien<br />
          <span style={{ color: OR, fontStyle: "italic" }}>qui vous ressemble.</span>
        </h1>
        <p style={{ color: "#E2DCCB", fontSize: 15, margin: "0 0 26px" }}>Des biens vérifiés à Agadir, Marrakech, Casablanca et partout au Maroc.</p>

        <div style={{ background: "#fff", borderRadius: 14, padding: 16, maxWidth: 600, margin: "0 auto", textAlign: "left" }}>
          <div style={{ display: "inline-flex", marginBottom: 14, background: "#F2ECDD", borderRadius: 30, padding: 4 }}>
            <span style={{ background: VERT, color: "#fff", padding: "8px 24px", borderRadius: 30, fontSize: 13 }}>Acheter</span>
            <span style={{ color: VERT, padding: "8px 24px", borderRadius: 30, fontSize: 13 }}>Louer</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
            {["Ville", "Type", "Budget"].map((l) => (
              <div key={l}>
                <label style={{ fontSize: 11, color: "#888" }}>{l}</label>
                <div style={{ border: "1px solid #E0DAC8", borderRadius: 8, padding: 9, fontSize: 13, color: VERT }}>Tous ▾</div>
              </div>
            ))}
            <div style={{ background: OR, color: VERT, padding: "11px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600 }}>Rechercher</div>
          </div>
        </div>
        <div style={{ marginTop: 16, fontSize: 12, color: "#CFC8B6" }}>
          Tendances : <span style={{ color: OR }}>Agadir</span> · <span style={{ color: OR }}>Marrakech</span> · <span style={{ color: OR }}>Casablanca</span> · <span style={{ color: OR }}>Tanger</span>
        </div>
      </section>

      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "var(--font-marcellus), serif", color: VERT, fontSize: 26, fontWeight: 400, margin: 0 }}>Notre sélection</h2>
          <span style={{ fontSize: 13, color: EMERAUDE }}>Voir tous les biens →</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
          {biens?.map((bien) => (
            <Link key={bien.id} href={cheminBien(bien)} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid #E8E2D2" }}>
                <div style={{ height: 160, background: "#EDE7D7", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {bien.photos?.[0] ? (
                    <img src={bien.photos[0]} alt={bien.titre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#C2BBA3" strokeWidth="1.4">
                      <path d="M3 11 L12 4 L21 11 M5 9.5 V20 H19 V9.5" />
                    </svg>
                  )}
                  {bien.verifie && (
                    <span style={{ position: "absolute", top: 10, left: 10, background: "#fff", color: VERT, fontSize: 11, padding: "3px 9px", borderRadius: 5, border: `1px solid ${OR}` }}>✓ Vérifié</span>
                  )}
                  <span style={{ position: "absolute", top: 10, right: 10, background: bien.transaction === "location" ? OR : EMERAUDE, color: bien.transaction === "location" ? VERT : "#fff", fontSize: 11, padding: "3px 9px", borderRadius: 5 }}>
                    {bien.transaction === "location" ? "À louer" : "À vendre"}
                  </span>
                </div>
                <div style={{ padding: 14 }}>
                  <p style={{ fontSize: 12, color: "#888", margin: "0 0 3px" }}>{bien.type} · {bien.quartier}, {bien.ville}</p>
                  <p style={{ fontFamily: "var(--font-marcellus), serif", color: VERT, fontSize: 16, margin: "0 0 8px", lineHeight: 1.3 }}>{bien.titre}</p>
                  <p style={{ color: VERT, fontSize: 19, fontWeight: 600, margin: "0 0 8px" }}>
                    {bien.prix.toLocaleString("fr-FR")} <span style={{ fontSize: 13, fontWeight: 400 }}>DH{bien.transaction === "location" ? "/mois" : ""}</span>
                  </p>
                  <div style={{ display: "flex", gap: 14, fontSize: 12, color: "#666", borderTop: "1px solid #EEE8D8", paddingTop: 8 }}>
                    <span>{bien.chambres} ch</span>
                    <span>{bien.salles_bain} sdb</span>
                    <span>{bien.surface} m²</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer style={{ background: VERT, padding: "24px", textAlign: "center" }}>
        <span style={{ fontFamily: "var(--font-marcellus), serif", color: "#fff", fontSize: 16, letterSpacing: 1 }}>HOOMY<span style={{ color: OR }}>.MA</span></span>
        <p style={{ fontSize: 11, color: "#9A9382", margin: "8px 0 0" }}>© 2026 HOOMY.MA — L'immobilier premium au Maroc</p>
      </footer>
    </main>
  );
}