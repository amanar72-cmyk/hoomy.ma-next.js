import { FondZellige } from "@/components/ui/MotifZellige";
import ReassuranceClient from "./ReassuranceClient";

// Section serveur : wrapper + fond zellige + titre.
// Les compteurs animés (stats réelles) et le stagger des piliers sont dans
// ReassuranceClient (interactivité au scroll).

type Props = { nbQuartiers: number; nbVilles: number };

export default function PourquoiHoomy({ nbQuartiers, nbVilles }: Props) {
  return (
    <section className="py-16 px-6 relative overflow-hidden" style={{ background: "var(--primaire)" }}>
      {/* Texture zellige en filigrane — blanc pur à 8 % pour fonctionner sur fond vert ET or (mode nuit) */}
      <FondZellige
        couleur="rgba(255,255,255,0.08)"
        opacite={1}
        taille={78}
        patternId="zellige-pourquoi"
      />
      <div className="max-w-6xl mx-auto relative">
        <h2
          className="text-3xl font-normal text-center mb-3"
          style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--fond-secondaire)" }}
        >
          Pourquoi choisir HOOMY.MA ?
        </h2>
        <p className="text-center text-sm mb-14" style={{ color: "var(--texte-tertiaire)" }}>
          La plateforme immobilière de confiance au Maroc.
        </p>

        <ReassuranceClient nbQuartiers={nbQuartiers} nbVilles={nbVilles} />
      </div>
    </section>
  );
}
