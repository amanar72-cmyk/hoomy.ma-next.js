import type { Metadata } from "next";
import ListeProprietaires from "@/components/proprietaires/ListeProprietaires";

export const metadata: Metadata = {
  title: "Propriétaires — Espace Pro",
};

type SearchParams = Promise<{ q?: string }>;

export default async function PageProprietairesPro({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  return <ListeProprietaires base="/pro" q={sp.q} />;
}
