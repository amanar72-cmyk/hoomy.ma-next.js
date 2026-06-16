import { supabase } from "@/lib/supabase";
import CarteAnnonce from "@/components/annonces/CarteAnnonce";
import type { Bien } from "@/lib/types";

type Props = {
  ville: string;
  type: string;
  transaction: string;
  idExclu: string;
};

export default async function BiensSimiliaires({ ville, type, transaction, idExclu }: Props) {
  const { data } = await supabase
    .from("biens")
    .select("*")
    .eq("transaction", transaction)
    .eq("ville", ville)
    .eq("type", type)
    .neq("id", idExclu)
    .limit(3);

  const biens = (data ?? []) as Bien[];

  if (biens.length === 0) return null;

  return (
    <section className="py-12 px-6" style={{ background: "#FAF7F0" }}>
      <div className="max-w-6xl mx-auto">
        <h2
          className="text-2xl font-normal mb-8"
          style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}
        >
          Biens similaires
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {biens.map((bien) => (
            <CarteAnnonce key={bien.id} bien={bien} />
          ))}
        </div>
      </div>
    </section>
  );
}
