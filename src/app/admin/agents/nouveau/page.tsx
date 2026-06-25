import Link from "next/link";
import type { Metadata } from "next";
import FormulaireInvitationAgent from "@/components/admin/FormulaireInvitationAgent";

export const metadata: Metadata = {
  title: "Inviter un agent — Admin HOOMY.MA",
};

export default function PageNouvelAgent() {
  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">

      {/* Breadcrumb */}
      <Link
        href="/admin/agents"
        className="inline-flex items-center gap-1.5 text-xs mb-5 hover:underline"
        style={{ color: "#999", textDecoration: "none" }}
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Agents
      </Link>

      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold mb-1" style={{ color: "#111" }}>
          Inviter un agent
        </h1>
        <p className="text-sm" style={{ color: "#999" }}>
          Un e-mail d'invitation sera envoyé. L'agent crée son mot de passe en cliquant le lien.
        </p>
      </div>

      <FormulaireInvitationAgent />
    </div>
  );
}
