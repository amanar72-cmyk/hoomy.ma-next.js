import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Route de diagnostic — accéder à /api/test-supabase pour vérifier la connexion Supabase
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({
      ok: false,
      erreur: "Variables d'environnement manquantes",
      url: url ?? "MANQUANT",
      key: key ? `${key.slice(0, 15)}…` : "MANQUANT",
    });
  }

  try {
    const supabase = await createClient();

    // Test 1 : peut-on appeler l'API auth ?
    const { data: authData, error: authError } = await supabase.auth.getUser();

    // Test 2 : peut-on lire la table biens ?
    const { count, error: dbError } = await supabase
      .from("biens")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      ok: true,
      url: url,
      key: `${key.slice(0, 15)}…`,
      auth: {
        utilisateur: authData?.user?.email ?? "non connecté",
        erreur: authError?.message ?? null,
      },
      base_de_donnees: {
        biens_count: count,
        erreur: dbError?.message ?? null,
      },
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      erreur: e instanceof Error ? e.message : String(e),
      url: url,
      key: `${key.slice(0, 15)}…`,
    });
  }
}
