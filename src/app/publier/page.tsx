import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import WizardPublication from "@/components/publier/WizardPublication";

export const metadata: Metadata = {
  title: "Publier votre annonce immobilière gratuitement",
  description:
    "Vendez ou louez votre bien au Maroc avec HOOMY : publication gratuite, photos illimitées, accompagnement par un conseiller dédié.",
  alternates: { canonical: "/publier" },
};

export default async function PagePublier() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main
      className="min-h-screen"
      style={{ background: "linear-gradient(160deg,#f0f7f4 0%,#FAF7F0 60%,#f5efe3 100%)" }}
    >
      <WizardPublication userId={user?.id ?? null} />
    </main>
  );
}
