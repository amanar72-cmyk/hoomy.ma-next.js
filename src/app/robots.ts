import { MetadataRoute } from "next";
import { estSitePublic } from "@/lib/hote";

// robots.txt — SERVI DIFFÉREMMENT SELON L'HÔTE.
//
// Le même déploiement répond sur deux domaines : hoomy.ma (site public) et
// pro.hoomy.ma (back-office). Jusqu'ici les deux renvoyaient « Allow: / » :
// le back-office était donc entièrement ouvert aux robots, qui y trouvaient
// au minimum la page de connexion.
//
// La détection d'hôte réutilise estSitePublic() — déjà employée pour
// n'activer GA4 et le Pixel Meta que sur le site public. Elle lit
// x-forwarded-host, seul en-tête à porter le domaine réellement demandé
// derrière le reverse proxy Hostinger.
//
// ⚠️ Cette route DOIT être exemptée dans middleware.ts : sans exemption, une
// requête non authentifiée vers pro.hoomy.ma/robots.txt est redirigée vers
// /connexion, et le robot reçoit une page HTML au lieu du fichier — ce qu'il
// interprète comme « tout est autorisé », exactement l'inverse du but.
export const dynamic = "force-dynamic";

// Chemins sans valeur d'indexation, et qu'on ne veut pas voir dans les SERP :
// espace personnel, parcours d'authentification, et l'API (des réponses JSON
// indexées diluent le site et gaspillent le budget de crawl).
const CHEMINS_PRIVES = [
  "/api/",
  "/mon-compte/",
  "/connexion",
  "/inscription",
  "/auth/",
  "/mot-de-passe-oublie",
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Back-office : rien à indexer, nulle part.
  if (!(await estSitePublic())) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: CHEMINS_PRIVES,
    },
    sitemap: "https://hoomy.ma/sitemap.xml",
  };
}
