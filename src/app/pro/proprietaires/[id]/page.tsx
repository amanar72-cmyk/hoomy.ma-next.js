import FicheProprietaire from "@/components/proprietaires/FicheProprietaire";

type Params = Promise<{ id: string }>;

export default async function PageFicheProprietairePro({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  return <FicheProprietaire base="/pro" id={id} />;
}
