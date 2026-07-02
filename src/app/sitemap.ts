import { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

const SITE = "https://hoomy.ma";

// Pages statiques principales (les pages « en construction » sont exclues)
const PAGES_STATIQUES: { chemin: string; priorite: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { chemin: "",                   priorite: 1,   freq: "daily" },
  { chemin: "/acheter",           priorite: 0.9, freq: "daily" },
  { chemin: "/louer",             priorite: 0.9, freq: "daily" },
  { chemin: "/estimer",           priorite: 0.8, freq: "weekly" },
  { chemin: "/publier",           priorite: 0.8, freq: "weekly" },
  { chemin: "/carte",             priorite: 0.7, freq: "weekly" },
  { chemin: "/carte-des-prix",    priorite: 0.6, freq: "weekly" },
  { chemin: "/simulateur-credit", priorite: 0.6, freq: "monthly" },
  { chemin: "/frais-acquisition", priorite: 0.6, freq: "monthly" },
  { chemin: "/comment-ca-marche", priorite: 0.5, freq: "monthly" },
  { chemin: "/a-propos",          priorite: 0.4, freq: "monthly" },
  { chemin: "/contact",           priorite: 0.5, freq: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statiques: MetadataRoute.Sitemap = PAGES_STATIQUES.map((p) => ({
    url: `${SITE}${p.chemin}`,
    changeFrequency: p.freq,
    priority: p.priorite,
  }));

  // Fiches biens publiées (vérifiées) — URLs canoniques par slug
  const { data: biens } = await supabase
    .from("biens")
    .select("slug, transaction, cree_le")
    .eq("verifie", true)
    .not("slug", "is", null);

  const fiches: MetadataRoute.Sitemap = (biens ?? []).map((b) => ({
    url: `${SITE}/${b.transaction === "location" ? "louer" : "acheter"}/${b.slug}`,
    lastModified: b.cree_le ? new Date(b.cree_le) : undefined,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...statiques, ...fiches];
}
