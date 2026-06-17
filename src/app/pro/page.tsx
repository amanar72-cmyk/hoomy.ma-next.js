import { redirect } from "next/navigation";

// Redirige vers la page principale de l'espace Pro
export default function PagePro() {
  redirect("/pro/biens");
}
