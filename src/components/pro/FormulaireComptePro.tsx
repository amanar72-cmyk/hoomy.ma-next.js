"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
  nomComplet: string;
  telephone: string;
  email: string;
  role: string;
};

export default function FormulaireComptePro({ userId, nomComplet, telephone, email, role }: Props) {
  const [nom, setNom] = useState(nomComplet);
  const [tel, setTel] = useState(telephone ?? "");
  const [chargement, setChargement] = useState(false);
  const [succes, setSucces] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Changement de mot de passe
  const [mdpActuel, setMdpActuel] = useState("");
  const [mdpNouveau, setMdpNouveau] = useState("");
  const [mdpConfirm, setMdpConfirm] = useState("");
  const [chargementMdp, setChargementMdp] = useState(false);
  const [succesMdp, setSuccesMdp] = useState(false);
  const [erreurMdp, setErreurMdp] = useState<string | null>(null);

  const inp = { borderColor: "#E0DAC8", color: "#0F4C3A", background: "#fff" };

  async function enregistrer() {
    if (!nom.trim()) { setErreur("Le nom est requis."); return; }
    setErreur(null);
    setSucces(false);
    setChargement(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profils")
        .update({ nom_complet: nom.trim(), telephone: tel.trim() || null })
        .eq("id", userId);
      if (error) { setErreur(error.message); return; }
      setSucces(true);
    } finally {
      setChargement(false);
    }
  }

  async function changerMotDePasse() {
    setErreurMdp(null);
    setSuccesMdp(false);
    if (!mdpNouveau || mdpNouveau.length < 6) { setErreurMdp("Mot de passe trop court (min. 6 caractères)."); return; }
    if (mdpNouveau !== mdpConfirm) { setErreurMdp("Les mots de passe ne correspondent pas."); return; }
    setChargementMdp(true);
    try {
      const supabase = createClient();
      // Vérifier l'ancien mdp en se reconnectant
      const { error: errConnexion } = await supabase.auth.signInWithPassword({ email, password: mdpActuel });
      if (errConnexion) { setErreurMdp("Mot de passe actuel incorrect."); return; }
      const { error } = await supabase.auth.updateUser({ password: mdpNouveau });
      if (error) { setErreurMdp(error.message); return; }
      setSuccesMdp(true);
      setMdpActuel(""); setMdpNouveau(""); setMdpConfirm("");
    } finally {
      setChargementMdp(false);
    }
  }

  const COULEURS_ROLE: Record<string, { bg: string; color: string }> = {
    admin: { bg: "#FEF3C7", color: "#92400E" },
    agent: { bg: "#D1FAE5", color: "#065F46" },
    agence: { bg: "#DBEAFE", color: "#1E40AF" },
  };
  const couleurRole = COULEURS_ROLE[role] ?? { bg: "#F3F4F6", color: "#6B7280" };

  return (
    <div className="max-w-2xl flex flex-col gap-6">

      {/* Profil */}
      <section className="rounded-2xl p-6 border"
        style={{ background: "#fff", borderColor: "#F0EDE5", boxShadow: "0 2px 16px rgba(15,76,58,0.05)" }}>
        <h2 className="text-base font-medium mb-5" style={{ color: "#0F4C3A" }}>
          Informations personnelles
        </h2>

        {succes && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm border"
            style={{ background: "#D1FAE5", color: "#065F46", borderColor: "#6EE7B7" }}>
            Profil enregistré avec succès.
          </div>
        )}
        {erreur && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm border"
            style={{ background: "#FEF2F2", color: "#991B1B", borderColor: "#FECACA" }}>
            {erreur}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#555" }}>Nom complet</label>
            <input type="text" value={nom} onChange={(e) => setNom(e.target.value)}
              className="w-full border rounded-xl px-4 py-2.5 text-sm" style={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#555" }}>Adresse email</label>
            <input type="email" value={email} disabled
              className="w-full border rounded-xl px-4 py-2.5 text-sm opacity-60" style={inp} />
            <p className="text-xs mt-1" style={{ color: "#9DB8AD" }}>L'email ne peut pas être modifié ici.</p>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#555" }}>Téléphone</label>
            <input type="tel" value={tel} onChange={(e) => setTel(e.target.value)}
              placeholder="+212 6 XX XX XX XX"
              className="w-full border rounded-xl px-4 py-2.5 text-sm" style={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#555" }}>Rôle</label>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center text-xs px-3 py-1 rounded-full font-medium capitalize"
                style={{ background: couleurRole.bg, color: couleurRole.color }}>
                {role}
              </span>
              <span className="text-xs" style={{ color: "#9DB8AD" }}>Modification via l'administration.</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button type="button" onClick={enregistrer} disabled={chargement}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60"
            style={{ background: "#0F4C3A", color: "#fff" }}>
            {chargement ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </section>

      {/* Préférences (placeholder) */}
      <section className="rounded-2xl p-6 border"
        style={{ background: "#fff", borderColor: "#F0EDE5", boxShadow: "0 2px 16px rgba(15,76,58,0.05)" }}>
        <h2 className="text-base font-medium mb-2" style={{ color: "#0F4C3A" }}>Préférences</h2>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>
          Les préférences de notification et d'affichage seront disponibles prochainement.
        </p>
      </section>

      {/* Sécurité — changement de mot de passe */}
      <section className="rounded-2xl p-6 border"
        style={{ background: "#fff", borderColor: "#F0EDE5", boxShadow: "0 2px 16px rgba(15,76,58,0.05)" }}>
        <h2 className="text-base font-medium mb-5" style={{ color: "#0F4C3A" }}>Sécurité</h2>

        {succesMdp && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm border"
            style={{ background: "#D1FAE5", color: "#065F46", borderColor: "#6EE7B7" }}>
            Mot de passe mis à jour avec succès.
          </div>
        )}
        {erreurMdp && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm border"
            style={{ background: "#FEF2F2", color: "#991B1B", borderColor: "#FECACA" }}>
            {erreurMdp}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#555" }}>Mot de passe actuel</label>
            <input type="password" value={mdpActuel} onChange={(e) => setMdpActuel(e.target.value)}
              placeholder="••••••••" className="w-full border rounded-xl px-4 py-2.5 text-sm" style={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#555" }}>Nouveau mot de passe</label>
            <input type="password" value={mdpNouveau} onChange={(e) => setMdpNouveau(e.target.value)}
              placeholder="••••••••" className="w-full border rounded-xl px-4 py-2.5 text-sm" style={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#555" }}>Confirmer</label>
            <input type="password" value={mdpConfirm} onChange={(e) => setMdpConfirm(e.target.value)}
              placeholder="••••••••" className="w-full border rounded-xl px-4 py-2.5 text-sm" style={inp} />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button type="button" onClick={changerMotDePasse} disabled={chargementMdp}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60"
            style={{ background: "#D4AF37", color: "#0F4C3A" }}>
            {chargementMdp ? "Mise à jour…" : "Changer le mot de passe"}
          </button>
        </div>
      </section>
    </div>
  );
}
