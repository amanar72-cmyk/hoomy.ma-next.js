import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import FormulaireDefinirMotDePasse from "@/components/auth/FormulaireDefinirMotDePasse";

// Page d'atterrissage après clic sur le lien d'invitation.
// Le callback (/auth/callback) a déjà échangé le code et créé la session.
export default async function PageDefinirMotDePasse() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Si pas de session active : lien expiré ou déjà utilisé
  if (!user) {
    redirect("/connexion?erreur=lien-expire");
  }

  return <FormulaireDefinirMotDePasse />;
}
