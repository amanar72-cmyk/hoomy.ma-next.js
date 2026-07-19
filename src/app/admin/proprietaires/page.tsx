import type { Metadata } from "next";
import ListeProprietaires from "@/components/proprietaires/ListeProprietaires";

export const metadata: Metadata = {
  title: "Propriétaires | HOOMY Admin",
};

type SearchParams = Promise<{ q?: string }>;

export default async function PageProprietairesAdmin({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  return <ListeProprietaires base="/admin" q={sp.q} />;
}
