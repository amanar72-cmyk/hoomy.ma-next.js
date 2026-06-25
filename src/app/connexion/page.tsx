import { headers } from "next/headers";
import Navbar from "@/components/home/Navbar";
import FormulaireConnexion from "@/components/auth/FormulaireConnexion";
import FormulaireConnexionPro from "@/components/auth/FormulaireConnexionPro";

export default async function PageConnexion() {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const estPro = host.startsWith("pro.");

  if (estPro) {
    return <FormulaireConnexionPro />;
  }

  return (
    <>
      <Navbar />
      <FormulaireConnexion />
    </>
  );
}
