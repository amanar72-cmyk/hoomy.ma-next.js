"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { cheminBien } from "@/lib/url";

const VERT = "var(--primaire)";
const EMERAUDE = "var(--primaire-clair)";
const OR = "var(--accent)";

type Bien = {
  id: string; reference: string; slug: string | null; titre: string;
  type: string; transaction: string; prix: number; ville: string; quartier: string | null;
  chambres: number; salles_bain: number; surface: number; verifie: boolean; photos: string[] | null;
};

export default function ListeBiens({ biens, titre }: { biens: Bien[]; titre: string }) {
  const [ville, setVille] = useState("");
  const [type, setType] = useState("");
  const [budget, setBudget] = useState("");

  const villes = useMemo(() => [...new Set(biens.map((b) => b.ville))].sort(), [biens]);
  const types = useMemo(() => [...new Set(biens.map((b) => b.type))].sort(), [biens]);

  const filtres = biens.filter((b) => {
    if (ville && b.ville !== ville) return false;
    if (type && b.type !== type) return false;
    if (budget === "0-500000" && b.prix > 500000) return false;
    if (budget === "500000-1000000" && (b.prix < 500000 || b.prix > 1000000)) return false;
    if (budget === "1000000-3000000" && (b.prix < 1000000 || b.prix > 3000000)) return false;
    if (budget === "3000000+" && b.prix < 3000000) return false;
    return true;
  });

  const champ = { border: "1px solid #E0DAC8", borderRadius: 8, padding: 10, fontSize: 14, color: VERT, background: "var(--fond-secondaire)", width: "100%" };

  return (
    <section style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
      <h1 style={{ fontFamily: "var(--font-marcellus), serif", color: VERT, fontSize: 28, fontWeight: 400, marginBottom: 20 }}>{titre}</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24, background: "var(--fond-secondaire)", padding: 16, borderRadius: 12, border: "1px solid #E8E2D2" }}>
        <div>
          <label style={{ fontSize: 12, color: "#888" }}>Ville</label>
          <select value={ville} onChange={(e) => setVille(e.target.value)} style={champ}>
            <option value="">Toutes les villes</option>
            {villes.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#888" }}>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} style={champ}>
            <option value="">Tous les types</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#888" }}>Budget</label>
          <select value={budget} onChange={(e) => setBudget(e.target.value)} style={champ}>
            <option value="">Tous les budgets</option>
            <option value="0-500000">Moins de 500 000 DH</option>
            <option value="500000-1000000">500 000 – 1 000 000 DH</option>
            <option value="1000000-3000000">1 – 3 millions DH</option>
            <option value="3000000+">Plus de 3 millions DH</option>
          </select>
        </div>
      </div>

      <p style={{ color: "var(--texte-chaud)", fontSize: 14, marginBottom: 16 }}>{filtres.length} bien{filtres.length > 1 ? "s" : ""} trouvé{filtres.length > 1 ? "s" : ""}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
        {filtres.map((bien) => (
          <Link key={bien.id} href={cheminBien(bien)} style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ background: "var(--fond-secondaire)", borderRadius: 12, overflow: "hidden", border: "1px solid #E8E2D2" }}>
              <div style={{ height: 160, background: "var(--bordure)", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {bien.photos?.[0] ? (
                  <img src={bien.photos[0]} alt={bien.titre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ color: "#B4AD97", fontSize: 13 }}>Pas de photo</span>
                )}
                {bien.verifie && (
                  <span style={{ position: "absolute", top: 10, left: 10, background: "var(--fond-secondaire)", color: VERT, fontSize: 11, padding: "3px 9px", borderRadius: 5, border: `1px solid ${OR}` }}>✓ Vérifié</span>
                )}
                <span style={{ position: "absolute", top: 10, right: 10, background: bien.transaction === "location" ? OR : EMERAUDE, color: bien.transaction === "location" ? VERT : "var(--fond-secondaire)", fontSize: 11, padding: "3px 9px", borderRadius: 5 }}>
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
  );
}