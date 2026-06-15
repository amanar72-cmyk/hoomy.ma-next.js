import { supabase } from "@/lib/supabase";
import { refDepuisSlug } from "@/lib/url";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const VERT = "#0F4C3A";
const EMERAUDE = "#146C43";
const OR = "#D4AF37";

export default async function FicheBien({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const reference = refDepuisSlug(slug);

  const { data: bien } = await supabase.from("biens").select("*").eq("reference", reference).single();
  if (!bien) notFound();

  return (
    <main style={{ background: "#FAF7F0", minHeight: "100vh" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px" }}>
        <Link href="/" style={{ color: EMERAUDE, fontSize: 14, textDecoration: "none" }}>← Retour aux biens</Link>

        <div style={{ height: 380, borderRadius: 16, overflow: "hidden", margin: "16px 0", background: "#EDE7D7", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {bien.photos?.[0] ? (
            <img src={bien.photos[0]} alt={bien.titre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ color: "#B4AD97" }}>Pas de photo</span>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <span style={{ background: bien.transaction === "location" ? OR : EMERAUDE, color: bien.transaction === "location" ? VERT : "#fff", fontSize: 12, padding: "4px 12px", borderRadius: 6 }}>
            {bien.transaction === "location" ? "À louer" : "À vendre"}
          </span>
          {bien.verifie && (
            <span style={{ background: "#fff", color: VERT, fontSize: 12, padding: "4px 12px", borderRadius: 6, border: `1px solid ${OR}` }}>✓ Vérifié</span>
          )}
        </div>

        <h1 style={{ fontFamily: "var(--font-marcellus), serif", color: VERT, fontSize: 30, fontWeight: 400, margin: "0 0 4px" }}>{bien.titre}</h1>
        <p style={{ color: "#6B6450", fontSize: 16, margin: "0 0 16px" }}>{bien.quartier}, {bien.ville}</p>

        <p style={{ color: VERT, fontSize: 28, fontWeight: 600, margin: "0 0 20px" }}>
          {bien.prix.toLocaleString("fr-FR")} <span style={{ fontSize: 16, fontWeight: 400 }}>DH{bien.transaction === "location" ? "/mois" : ""}</span>
        </p>

        <div style={{ display: "flex", gap: 24, padding: "16px 0", borderTop: "1px solid #E8E2D2", borderBottom: "1px solid #E8E2D2", marginBottom: 20, color: "#3D4A42", fontSize: 15 }}>
          <span>{bien.type}</span>
          <span>{bien.chambres} chambres</span>
          <span>{bien.salles_bain} salles de bain</span>
          <span>{bien.surface} m²</span>
        </div>

        <h2 style={{ fontFamily: "var(--font-marcellus), serif", color: VERT, fontSize: 20, fontWeight: 400 }}>Description</h2>
        <p style={{ lineHeight: 1.7, color: "#3D4A42" }}>{bien.description}</p>

        {bien.equipements?.length > 0 && (
          <>
            <h2 style={{ fontFamily: "var(--font-marcellus), serif", color: VERT, fontSize: 20, fontWeight: 400, marginTop: 24 }}>Équipements</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {bien.equipements.map((e: string) => (
                <span key={e} style={{ background: "#fff", border: "1px solid #E8E2D2", borderRadius: 20, padding: "6px 14px", fontSize: 13, color: "#3D4A42" }}>{e}</span>
              ))}
            </div>
          </>
        )}

        <p style={{ fontSize: 12, color: "#999", marginTop: 28 }}>Référence : {bien.reference}</p>
      </div>
    </main>
  );
}