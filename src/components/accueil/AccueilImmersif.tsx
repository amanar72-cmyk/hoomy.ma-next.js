"use client";

// Page d'accueil HOOMY — direction artistique « Immersif 3D ».
//
// Assets attendus dans /public/accueil/ (voir .gitkeep). Tant qu'ils sont
// absents, chaque plan retombe sur l'aplat de couleur défini en CSS : la page
// reste présentable, jamais d'image cassée.
//
// Les photos des biens viennent de Supabase Storage et sont rendues en <img>
// et non next/image : next.config.ts ne déclare aucun images.remotePatterns
// (même choix que CarteAnnonce).

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { formaterPrix } from "@/lib/format";
import type { BienPublic } from "@/lib/types";

const VERT_PROFOND = "#071A14";
const VERT_MI = "#123F31";
const OR = "#D4AF37";

// vitesse = parallaxe au scroll, souris = amplitude du suivi du curseur
const PLANS = [
  { vitesse: 0.1, souris: 4 },
  { vitesse: 0.22, souris: 10 },
  { vitesse: 0.36, souris: 18 },
  { vitesse: 0.52, souris: 26 },
  { vitesse: 0.72, souris: 34 },
] as const;

export default function AccueilImmersif({ biens }: { biens: BienPublic[] }) {
  const heroRef = useRef<HTMLElement | null>(null);
  const plansRef = useRef<(HTMLDivElement | null)[]>([]);
  const carteRef = useRef<HTMLDivElement | null>(null);
  const reelRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const mobile = window.matchMedia("(max-width: 820px)").matches;

    let scrollY = window.scrollY;
    let sx = 0;
    let sy = 0;
    let frame: number | null = null;

    const rendre = () => {
      frame = null;

      if (!mobile) {
        plansRef.current.forEach((el, i) => {
          if (!el) return;
          const { vitesse, souris } = PLANS[i];
          const ty = -scrollY * vitesse + sy * souris * 0.55;
          const tx = sx * souris;
          const ech = 1 + vitesse * 0.06;
          el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${ech.toFixed(3)})`;
        });
      }

      const scene = sceneRef.current;
      const carte = carteRef.current;
      const reel = reelRef.current;
      if (scene && carte && reel) {
        const r = scene.getBoundingClientRect();
        const t = Math.max(0, Math.min(1, 1 - (r.top + r.height * 0.35) / window.innerHeight));
        carte.style.transform = `scale(${(1 + t * 0.85).toFixed(3)}) rotateX(${((1 - t) * 14).toFixed(2)}deg)`;
        carte.style.opacity = (1 - Math.max(0, (t - 0.55) / 0.35)).toFixed(3);
        reel.style.opacity = Math.max(0, (t - 0.5) / 0.4).toFixed(3);
        reel.style.transform = `scale(${(1.12 - t * 0.12).toFixed(3)})`;
      }
    };

    const demander = () => {
      if (frame === null) frame = requestAnimationFrame(rendre);
    };

    const onScroll = () => {
      scrollY = window.scrollY;
      demander();
    };
    const onMouse = (e: MouseEvent) => {
      sx = (e.clientX / window.innerWidth - 0.5) * 2;
      sy = (e.clientY / window.innerHeight - 0.5) * 2;
      demander();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    const hero = heroRef.current;
    if (hero && !mobile) hero.addEventListener("mousemove", onMouse);
    rendre();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (hero) hero.removeEventListener("mousemove", onMouse);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  const enregistrerPlan = (i: number) => (el: HTMLDivElement | null) => {
    plansRef.current[i] = el;
  };

  return (
    <div style={{ background: VERT_PROFOND }} className="overflow-x-hidden text-[#EDE6D8]">
      <Hero heroRef={heroRef} enregistrerPlan={enregistrerPlan} />
      <Traversee sceneRef={sceneRef} carteRef={carteRef} reelRef={reelRef} />
      <Biens biens={biens} />
      <Parcours />
      <Cloture />
    </div>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────

function Plan({
  index,
  enregistrer,
  couleurRepli,
  className,
  children,
}: {
  index: number;
  enregistrer: (i: number) => (el: HTMLDivElement | null) => void;
  couleurRepli?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      ref={enregistrer(index)}
      className={`absolute inset-0 will-change-transform ${className ?? ""}`}
      style={couleurRepli ? { background: couleurRepli } : undefined}
    >
      {children}
    </div>
  );
}

function Hero({
  heroRef,
  enregistrerPlan,
}: {
  heroRef: React.MutableRefObject<HTMLElement | null>;
  enregistrerPlan: (i: number) => (el: HTMLDivElement | null) => void;
}) {
  return (
    <header
      ref={heroRef}
      className="relative h-screen min-h-[620px] overflow-hidden"
      style={{ perspective: "1200px" }}
    >
      <Plan index={0} enregistrer={enregistrerPlan} couleurRepli="#12332A">
        <Image src="/accueil/ciel.webp" alt="" fill priority sizes="100vw" className="object-cover" />
      </Plan>
      <Plan index={1} enregistrer={enregistrerPlan}>
        <div className="absolute inset-x-0 bottom-0 h-[46%]" style={{ background: VERT_MI }}>
          <Image src="/accueil/palmeraie.webp" alt="" fill sizes="100vw" className="object-cover object-bottom" />
        </div>
      </Plan>
      <Plan index={2} enregistrer={enregistrerPlan}>
        <div
          className="absolute inset-x-0 bottom-0 h-[52%]"
          style={{
            background: "#0F4C3A",
            clipPath:
              "polygon(0 38%,14% 38%,14% 16%,30% 16%,30% 30%,52% 30%,52% 8%,70% 8%,70% 26%,86% 26%,86% 40%,100% 40%,100% 100%,0 100%)",
          }}
        >
          <Image src="/accueil/medina.webp" alt="" fill sizes="100vw" className="object-cover object-bottom" />
        </div>
      </Plan>
      <Plan index={3} enregistrer={enregistrerPlan} className="flex items-center justify-center">
        <div className="h-[190px] w-[190px] rotate-45 border" style={{ borderColor: "rgba(212,175,55,.42)" }}>
          <div className="h-full w-full rotate-45 border" style={{ borderColor: "rgba(212,175,55,.42)" }} />
        </div>
      </Plan>
      <Plan index={4} enregistrer={enregistrerPlan}>
        <Image src="/accueil/arche.png" alt="" fill priority sizes="100vw" className="object-contain object-bottom" />
      </Plan>

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
        <p className="mb-6 text-[11px] uppercase tracking-[0.42em]" style={{ color: OR }}>
          Agadir · Marrakech · Casablanca
        </p>
        <h1 className="font-marcellus max-w-[15ch] text-[clamp(34px,6.2vw,74px)] leading-[1.15] text-white">
          Entrez avant
          <br />
          d&apos;<span style={{ color: OR }}>acheter</span>
        </h1>
        <p className="mt-6 max-w-[44ch] text-[15px] text-[#8FA79C]">
          Chaque bien filmé, situé et vérifié. Vous savez ce que vous visitez avant de vous déplacer.
        </p>
      </div>

      <form
        action="/acheter"
        className="absolute bottom-[11vh] left-1/2 z-20 flex h-[60px] w-[min(88vw,540px)] -translate-x-1/2 items-center gap-3 rounded-full border pl-6 pr-2 backdrop-blur"
        style={{ borderColor: "rgba(212,175,55,.5)", background: "rgba(7,26,20,.55)" }}
      >
        <input
          name="q"
          type="text"
          placeholder="Une villa à Agadir, un riad en médina…"
          aria-label="Rechercher un bien"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-[#EDE6D8] outline-none placeholder:text-[#8FA79C]"
        />
        <button
          type="submit"
          className="h-11 shrink-0 cursor-pointer rounded-full px-6 text-[14px] font-medium transition-[filter] hover:brightness-110"
          style={{ background: OR, color: VERT_PROFOND }}
        >
          Chercher
        </button>
      </form>

      <p className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-[#8FA79C]/70">
        Descendez
      </p>
    </header>
  );
}

// ── Traversée carte → réel ───────────────────────────────────────────────────

function Traversee({
  sceneRef,
  carteRef,
  reelRef,
}: {
  sceneRef: React.MutableRefObject<HTMLDivElement | null>;
  carteRef: React.MutableRefObject<HTMLDivElement | null>;
  reelRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  return (
    <section className="px-6 py-[130px] md:px-10">
      <div className="mx-auto max-w-[1180px]">
        <Legende>La traversée</Legende>
        <TitreSection>De la carte au seuil, sans coupure</TitreSection>
        <Intro>
          Le quartier se rapproche, puis devient le bien. C&apos;est le moment que les visiteurs
          retiennent.
        </Intro>

        <div
          ref={sceneRef}
          className="relative mt-16 h-[380px] md:h-[520px]"
          style={{ perspective: "1400px" }}
        >
          <div
            ref={carteRef}
            className="absolute inset-0 overflow-hidden rounded-[14px] will-change-transform"
            style={{ background: VERT_MI }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(212,175,55,.16) 1px,transparent 1px),linear-gradient(90deg,rgba(212,175,55,.16) 1px,transparent 1px)",
                backgroundSize: "74px 74px",
              }}
            />
          </div>
          <div
            ref={reelRef}
            className="absolute inset-0 overflow-hidden rounded-[14px] opacity-0 will-change-transform"
            style={{ background: "#0F4C3A" }}
          >
            <Image
              src="/accueil/quartier.webp"
              alt=""
              fill
              sizes="(max-width:1180px) 100vw, 1180px"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Biens (données réelles) ──────────────────────────────────────────────────

function Biens({ biens }: { biens: BienPublic[] }) {
  if (biens.length === 0) return null;

  const inclinaison = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (window.matchMedia("(max-width: 820px)").matches) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const rx = ((e.clientY - r.top) / r.height - 0.5) * -7;
    const ry = ((e.clientX - r.left) / r.width - 0.5) * 7;
    el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-6px)`;
  };
  const remettre = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.transform = "";
  };

  return (
    <section className="bg-[#0A2A20] px-6 py-[130px] md:px-10">
      <div className="mx-auto max-w-[1180px]">
        <Legende>Sélection</Legende>
        <TitreSection>Nos biens du moment</TitreSection>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {biens.map((b) => {
            const base = b.transaction === "location" ? "/louer" : "/acheter";
            const details = [
              b.quartier,
              b.surface ? `${b.surface} m²` : null,
              b.chambres ? `${b.chambres} ch.` : null,
            ].filter(Boolean);

            return (
              <Link
                key={b.id}
                href={`${base}/${b.slug ?? b.id}`}
                onMouseMove={inclinaison}
                onMouseLeave={remettre}
                className="block overflow-hidden rounded-[14px] border transition-[transform,border-color] duration-200 will-change-transform"
                style={{ background: "rgba(15,76,58,.42)", borderColor: "rgba(212,175,55,.18)", textDecoration: "none" }}
              >
                <div className="relative h-[230px]" style={{ background: VERT_MI }}>
                  {b.photos?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.photos[0]} alt={b.titre} className="h-full w-full object-cover" loading="lazy" />
                  )}
                </div>
                <div className="px-6 pb-7 pt-5">
                  <h3 className="font-marcellus text-[22px] text-white">{b.titre}</h3>
                  <p className="mt-1 text-[13px] tracking-wide text-[#8FA79C]">
                    {[b.ville, ...details].join(" · ")}
                  </p>
                  <p className="mt-3 text-[15px] tracking-wide" style={{ color: OR }}>
                    {formaterPrix(Number(b.prix), b.transaction)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Parcours vendeur ─────────────────────────────────────────────────────────

const ETAPES = [
  { rang: "I", titre: "Vous nous appelez", texte: "Un conseiller vous rappelle le jour même et fixe un rendez-vous chez vous." },
  { rang: "II", titre: "Nous venons sur place", texte: "Photos professionnelles, mesures, estimation argumentée et signature du mandat." },
  { rang: "III", titre: "Nous filtrons les visites", texte: "Seuls les acheteurs qualifiés se déplacent. Vous recevez un compte rendu après chaque visite." },
  { rang: "IV", titre: "Nous allons chez le notaire", texte: "Dossier complet, rendez-vous pris, conseiller présent le jour de la signature." },
] as const;

function Parcours() {
  const conteneur = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const cibles = conteneur.current?.querySelectorAll<HTMLElement>("[data-etape]");
    if (!cibles) return;
    const obs = new IntersectionObserver(
      (entrees) => {
        entrees.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.remove("opacity-0", "translate-y-6");
            obs.unobserve(en.target);
          }
        });
      },
      { threshold: 0.25 }
    );
    cibles.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <section className="px-6 py-[130px] md:px-10">
      <div className="mx-auto max-w-[1180px]">
        <Legende>Vous vendez</Legende>
        <TitreSection>Un conseiller vous suit du premier appel à la signature</TitreSection>

        <div ref={conteneur} className="mt-14 border-t" style={{ borderColor: "rgba(212,175,55,.16)" }}>
          {ETAPES.map((e, i) => (
            <div
              key={e.rang}
              data-etape
              style={{ borderColor: "rgba(212,175,55,.16)", transitionDelay: `${i * 90}ms` }}
              className="grid translate-y-6 grid-cols-[56px_1fr] gap-5 border-b py-9 opacity-0 transition-[opacity,transform] duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 md:grid-cols-[96px_1fr] md:gap-8"
            >
              <span className="font-marcellus pt-1 text-[15px] tracking-[0.2em]" style={{ color: OR }}>
                {e.rang}
              </span>
              <div>
                <h3 className="font-marcellus mb-2 text-[24px] text-white">{e.titre}</h3>
                <p className="max-w-[56ch] text-[15px] text-[#8FA79C]">{e.texte}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Clôture ──────────────────────────────────────────────────────────────────

function Cloture() {
  return (
    <section
      className="relative flex h-[88vh] min-h-[520px] items-center justify-center overflow-hidden text-center"
      style={{ background: "#0F4C3A" }}
    >
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        poster="/accueil/poster-drone.webp"
      >
        <source src="/accueil/drone.webm" type="video/webm" />
        <source src="/accueil/drone.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0" style={{ background: "rgba(7,26,20,.55)" }} />

      <div className="relative z-10 px-6">
        <h2 className="font-marcellus mx-auto mb-8 max-w-[16ch] text-[clamp(30px,4.4vw,58px)] leading-[1.15] text-white">
          Votre bien mérite d&apos;être vu autrement
        </h2>
        <Link
          href="/publier"
          className="inline-block rounded-full px-11 py-4 text-[15px] font-medium transition-[filter] hover:brightness-110"
          style={{ background: OR, color: VERT_PROFOND, textDecoration: "none" }}
        >
          Publier mon bien
        </Link>
      </div>
    </section>
  );
}

// ── Primitives typographiques ────────────────────────────────────────────────

function Legende({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-5 text-[11px] uppercase tracking-[0.34em]" style={{ color: OR }}>
      {children}
    </p>
  );
}

function TitreSection({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-marcellus mb-4 max-w-[18ch] text-[clamp(28px,3.6vw,46px)] leading-[1.15] text-white">
      {children}
    </h2>
  );
}

function Intro({ children }: { children: React.ReactNode }) {
  return <p className="max-w-[52ch] text-[16px] text-[#8FA79C]">{children}</p>;
}
