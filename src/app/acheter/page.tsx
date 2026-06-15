import { supabase } from "@/lib/supabase";
import ListeBiens from "@/components/ListeBiens";

export const dynamic = "force-dynamic";

export default async function PageAcheter() {
  const { data: biens } = await supabase.from("biens").select("*").eq("transaction", "vente").order("cree_le", { ascending: false });
  return <ListeBiens biens={biens ?? []} titre="Biens à vendre" />;
}