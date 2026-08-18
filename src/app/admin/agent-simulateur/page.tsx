import type { Metadata } from "next";
import SimulateurAgent from "@/components/admin/SimulateurAgent";

// Simulateur de l'agent commercial IA — page admin (le layout /admin impose
// déjà le rôle admin ; la route API revérifie de son côté).
// Aucun lead créé, aucun message envoyé à un vrai client — mais la
// conversation EST enregistrée, sous le numéro fictif +212000000000, pour
// tester la mémoire dans les mêmes conditions que WhatsApp.

export const metadata: Metadata = {
  title: "Agent IA — Simulateur — Espace Pro",
};

export default function PageAgentSimulateur() {
  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1
          className="text-2xl mb-1"
          style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}
        >
          Agent commercial IA — simulateur
        </h1>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>
          Testez le cerveau de l&apos;agent sans impliquer de vrai client : intention détectée,
          critères accumulés, biens réels remontés, réponse générée. La conversation se
          poursuit d&apos;un message à l&apos;autre (mémoire) et est enregistrée sous un numéro
          fictif — « Réinitialiser » repart de zéro.
        </p>
      </div>

      <SimulateurAgent />
    </div>
  );
}
