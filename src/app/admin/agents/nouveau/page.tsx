import Link from "next/link";
import FormulaireInvitationAgent from "@/components/admin/FormulaireInvitationAgent";

export default function PageNouvelAgent() {
  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-2">
        <Link
          href="/admin/agents"
          className="text-sm hover:underline"
          style={{ color: "#9DB8AD", textDecoration: "none" }}
        >
          ← Agents
        </Link>
        <span style={{ color: "#E0DAC8" }}>/</span>
        <span className="text-sm" style={{ color: "#0F4C3A" }}>Inviter un agent</span>
      </div>

      <div className="mb-8">
        <h1
          className="text-2xl mb-1"
          style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}
        >
          Inviter un agent
        </h1>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>
          Un e-mail d'invitation sera envoyé automatiquement. L'agent crée son mot de passe en cliquant le lien.
        </p>
      </div>

      <FormulaireInvitationAgent />
    </div>
  );
}
