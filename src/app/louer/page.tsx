import { supabase } from "@/lib/supabase";
import ListeBiens from "@/components/ListeBiens";

export const dynamic = "force-dynamic";

export default async function PageLouer() {
  const { data: biens } = await supabase.from("biens").select("*").eq("transaction", "location").order("cree_le", { ascending: false });
  return <ListeBiens biens={biens ?? []} titre="Biens à louer" />;
}