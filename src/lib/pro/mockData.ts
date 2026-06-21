// Données fictives pour les pages Pro — DEMO ONLY, aucune vraie donnée

export type MembreTeam = {
  id: string;
  nom: string;
  role: string;
  email: string;
  telephone: string;
  biens_actifs: number;
  leads_mois: number;
  avatar: string;
};

export type Contact = {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  type: "acheteur" | "vendeur" | "investisseur";
  ville: string;
  budget: string;
  date_contact: string;
};

export type Demande = {
  id: string;
  reference: string;
  client: string;
  type_bien: string;
  transaction: string;
  ville: string;
  budget: string;
  statut: "Nouvelle" | "En cours" | "Traitée" | "Annulée";
  date: string;
};

export type Lead = {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  budget: string;
  ville: string;
  type_bien: string;
  statut: "Nouveau" | "Qualifié" | "En cours" | "RDV planifié" | "Converti" | "Perdu";
  source: string;
  date: string;
  notes: string;
};

export type ReseauMembre = {
  id: string;
  nom: string;
  agence: string;
  ville: string;
  specialite: string;
  transactions_communes: number;
  telephone: string;
};

export type Quartier = {
  id: string;
  nom: string;
  ville: string;
  biens_actifs: number;
  prix_moyen: string;
  evolution: string;
  description: string;
};

export type Ressource = {
  id: string;
  titre: string;
  type: "Modèle" | "Guide" | "Formation" | "Outil";
  description: string;
  date: string;
  taille?: string;
};

export type Partenariat = {
  id: string;
  partenaire: string;
  type: "Notaire" | "Banque" | "Architecte" | "Diagnostiqueur" | "Autre";
  ville: string;
  contact: string;
  telephone: string;
  avantage: string;
};

export type BienNeuf = {
  id: string;
  titre: string;
  promoteur: string;
  ville: string;
  quartier: string;
  type: string;
  prix_partir: string;
  surface_min: number;
  surface_max: number;
  livraison: string;
  statut: "En commercialisation" | "Bientôt disponible" | "Vendu";
  image: string;
};

export type EvenementCalendrier = {
  id: string;
  titre: string;
  type: "RDV client" | "Visite" | "Signature" | "Réunion" | "Tâche";
  date: string;
  heure: string;
  lieu: string;
  client: string;
  bien_ref: string;
};

// --- TEAM ---
export const MOCK_TEAM: MembreTeam[] = [
  { id: "t1", nom: "Agent Démo Alpha", role: "agent", email: "alpha.demo@hoomy.ma", telephone: "+212 6 00 00 00 01", biens_actifs: 8, leads_mois: 14, avatar: "A" },
  { id: "t2", nom: "Agent Démo Bêta", role: "agent", email: "beta.demo@hoomy.ma", telephone: "+212 6 00 00 00 02", biens_actifs: 5, leads_mois: 9, avatar: "B" },
  { id: "t3", nom: "Coordinatrice Démo", role: "coordinatrice", email: "coord.demo@hoomy.ma", telephone: "+212 6 00 00 00 03", biens_actifs: 0, leads_mois: 22, avatar: "C" },
  { id: "t4", nom: "Agent Démo Gamma", role: "agent", email: "gamma.demo@hoomy.ma", telephone: "+212 6 00 00 00 04", biens_actifs: 11, leads_mois: 7, avatar: "G" },
];

// --- LEADS ---
export const MOCK_LEADS: Lead[] = [
  { id: "l1", nom: "Prospect Démo 1", email: "prospect1@yopmail.com", telephone: "+212 6 11 11 11 01", budget: "1 500 000 DH", ville: "Casablanca", type_bien: "Appartement", statut: "Nouveau", source: "Site web", date: "2026-06-10", notes: "Cherche F3 à Maarif." },
  { id: "l2", nom: "Prospect Démo 2", email: "prospect2@yopmail.com", telephone: "+212 6 11 11 11 02", budget: "800 000 DH", ville: "Marrakech", type_bien: "Appartement", statut: "Qualifié", source: "Recommandation", date: "2026-06-08", notes: "Budget flexible." },
  { id: "l3", nom: "Prospect Démo 3", email: "prospect3@yopmail.com", telephone: "+212 6 11 11 11 03", budget: "5 000 000 DH", ville: "Marrakech", type_bien: "Villa", statut: "En cours", source: "Portail", date: "2026-06-05", notes: "Demande piscine." },
  { id: "l4", nom: "Prospect Démo 4", email: "prospect4@yopmail.com", telephone: "+212 6 11 11 11 04", budget: "3 500 DH/mois", ville: "Rabat", type_bien: "Appartement", statut: "RDV planifié", source: "Site web", date: "2026-06-03", notes: "RDV 18/06 à 14h." },
  { id: "l5", nom: "Prospect Démo 5", email: "prospect5@yopmail.com", telephone: "+212 6 11 11 11 05", budget: "2 000 000 DH", ville: "Tanger", type_bien: "Bureau", statut: "Converti", source: "LinkedIn", date: "2026-05-28", notes: "Signé le 05/06." },
  { id: "l6", nom: "Prospect Démo 6", email: "prospect6@yopmail.com", telephone: "+212 6 11 11 11 06", budget: "600 000 DH", ville: "Agadir", type_bien: "Terrain", statut: "Perdu", source: "Portail", date: "2026-05-20", notes: "A choisi concurrent." },
  { id: "l7", nom: "Prospect Démo 7", email: "prospect7@yopmail.com", telephone: "+212 6 11 11 11 07", budget: "1 200 000 DH", ville: "Casablanca", type_bien: "Appartement", statut: "Nouveau", source: "Réseaux sociaux", date: "2026-06-14", notes: "À rappeler." },
  { id: "l8", nom: "Prospect Démo 8", email: "prospect8@yopmail.com", telephone: "+212 6 11 11 11 08", budget: "4 500 DH/mois", ville: "Casablanca", type_bien: "Appartement", statut: "Qualifié", source: "Site web", date: "2026-06-12", notes: "Priorité haute." },
];

// --- CONTACTS ---
export const MOCK_CONTACTS: Contact[] = [
  { id: "c1", nom: "Client Démo Un", email: "client1@yopmail.com", telephone: "+212 6 22 22 22 01", type: "acheteur", ville: "Casablanca", budget: "2 000 000 DH", date_contact: "2026-04-15" },
  { id: "c2", nom: "Client Démo Deux", email: "client2@yopmail.com", telephone: "+212 6 22 22 22 02", type: "vendeur", ville: "Marrakech", budget: "—", date_contact: "2026-03-22" },
  { id: "c3", nom: "Client Démo Trois", email: "client3@yopmail.com", telephone: "+212 6 22 22 22 03", type: "investisseur", ville: "Rabat", budget: "10 000 000 DH", date_contact: "2026-05-01" },
  { id: "c4", nom: "Client Démo Quatre", email: "client4@yopmail.com", telephone: "+212 6 22 22 22 04", type: "acheteur", ville: "Tanger", budget: "1 500 000 DH", date_contact: "2026-06-01" },
  { id: "c5", nom: "Client Démo Cinq", email: "client5@yopmail.com", telephone: "+212 6 22 22 22 05", type: "investisseur", ville: "Agadir", budget: "5 000 000 DH", date_contact: "2026-05-18" },
];

// --- DEMANDES ---
export const MOCK_DEMANDES: Demande[] = [
  { id: "d1", reference: "DEM000001", client: "Client Démo Un", type_bien: "Appartement", transaction: "vente", ville: "Casablanca", budget: "1 800 000 DH", statut: "Nouvelle", date: "2026-06-14" },
  { id: "d2", reference: "DEM000002", client: "Client Démo Deux", type_bien: "Villa", transaction: "location", ville: "Marrakech", budget: "15 000 DH/mois", statut: "En cours", date: "2026-06-10" },
  { id: "d3", reference: "DEM000003", client: "Client Démo Trois", type_bien: "Bureau", transaction: "vente", ville: "Rabat", budget: "3 000 000 DH", statut: "Traitée", date: "2026-05-28" },
  { id: "d4", reference: "DEM000004", client: "Client Démo Quatre", type_bien: "Appartement", transaction: "location", ville: "Tanger", budget: "4 500 DH/mois", statut: "Nouvelle", date: "2026-06-15" },
  { id: "d5", reference: "DEM000005", client: "Client Démo Cinq", type_bien: "Terrain", transaction: "vente", ville: "Agadir", budget: "2 500 000 DH", statut: "Annulée", date: "2026-05-10" },
];

// --- RÉSEAU ---
export const MOCK_RESEAU: ReseauMembre[] = [
  { id: "r1", nom: "Partenaire Démo Alpha", agence: "Agence Exemple Casablanca", ville: "Casablanca", specialite: "Appartements", transactions_communes: 3, telephone: "+212 5 22 00 00 01" },
  { id: "r2", nom: "Partenaire Démo Bêta", agence: "Réseau Immobilier Maroc", ville: "Marrakech", specialite: "Villas & Riads", transactions_communes: 7, telephone: "+212 5 24 00 00 02" },
  { id: "r3", nom: "Partenaire Démo Gamma", agence: "Immo Rabat Pro", ville: "Rabat", specialite: "Bureaux & Commerces", transactions_communes: 1, telephone: "+212 5 37 00 00 03" },
];

// --- QUARTIERS ---
export const MOCK_QUARTIERS: Quartier[] = [
  { id: "q1", nom: "Quartier Exemple 1", ville: "Casablanca", biens_actifs: 12, prix_moyen: "1 850 000 DH", evolution: "+3,2%", description: "Quartier résidentiel haut standing, accès autoroute." },
  { id: "q2", nom: "Quartier Exemple 2", ville: "Casablanca", biens_actifs: 7, prix_moyen: "950 000 DH", evolution: "+1,8%", description: "Secteur dynamique, bon rapport qualité/prix." },
  { id: "q3", nom: "Quartier Exemple 3", ville: "Marrakech", biens_actifs: 5, prix_moyen: "3 200 000 DH", evolution: "+5,1%", description: "Zone premium, demande touristique forte." },
  { id: "q4", nom: "Quartier Exemple 4", ville: "Rabat", biens_actifs: 9, prix_moyen: "1 200 000 DH", evolution: "+2,4%", description: "Proximité administrations et axes principaux." },
];

// --- RESSOURCES ---
export const MOCK_RESSOURCES: Ressource[] = [
  { id: "res1", titre: "Modèle Mandat Exclusif", type: "Modèle", description: "Modèle de mandat de vente exclusif conforme à la réglementation marocaine.", date: "2026-01-15", taille: "124 Ko" },
  { id: "res2", titre: "Guide Négociation Prix", type: "Guide", description: "Techniques et scripts de négociation pour conclure plus rapidement.", date: "2026-02-20", taille: "2,1 Mo" },
  { id: "res3", titre: "Formation Prospection Digitale", type: "Formation", description: "Module e-learning sur l'utilisation des réseaux sociaux pour générer des leads.", date: "2026-03-10" },
  { id: "res4", titre: "Calculateur Rentabilité Locative", type: "Outil", description: "Tableau Excel pour calculer la rentabilité nette d'un investissement locatif.", date: "2026-04-05", taille: "48 Ko" },
  { id: "res5", titre: "Modèle Compromis de Vente", type: "Modèle", description: "Avant-contrat type avec toutes les clauses suspensives standard.", date: "2026-05-12", taille: "210 Ko" },
];

// --- PARTENARIATS ---
export const MOCK_PARTENARIATS: Partenariat[] = [
  { id: "p1", partenaire: "Notaire Démo Casablanca", type: "Notaire", ville: "Casablanca", contact: "Me. Exemple Démo", telephone: "+212 5 22 00 10 00", avantage: "Tarifs préférentiels actes, délais réduits." },
  { id: "p2", partenaire: "Banque Partenaire Exemple", type: "Banque", ville: "National", contact: "Conseiller Pro Démo", telephone: "+212 5 22 00 20 00", avantage: "Taux hypothécaires exclusifs pour clients référés." },
  { id: "p3", partenaire: "Architecte Démo Marrakech", type: "Architecte", ville: "Marrakech", contact: "Archi. Exemple", telephone: "+212 5 24 00 30 00", avantage: "Études de faisabilité offertes, délais prioritaires." },
  { id: "p4", partenaire: "Expert Diagnostic Immobilier", type: "Diagnostiqueur", ville: "Rabat", contact: "Expert Démo", telephone: "+212 5 37 00 40 00", avantage: "Tarif groupé pour diagnostics énergétiques." },
];

// --- IMMOBILIER NEUF ---
export const MOCK_NEUF: BienNeuf[] = [
  { id: "n1", titre: "Résidence Démo Prestige", promoteur: "Promoteur Exemple SA", ville: "Casablanca", quartier: "Quartier Exemple 1", type: "Appartement", prix_partir: "1 200 000 DH", surface_min: 75, surface_max: 180, livraison: "T4 2026", statut: "En commercialisation", image: "" },
  { id: "n2", titre: "Villa Démo Green Park", promoteur: "Construction Exemple SARL", ville: "Marrakech", quartier: "Route de l'Exemple", type: "Villa", prix_partir: "4 500 000 DH", surface_min: 280, surface_max: 450, livraison: "T2 2027", statut: "Bientôt disponible", image: "" },
  { id: "n3", titre: "Appartements Démo Corniche", promoteur: "Immo Démo Group", ville: "Agadir", quartier: "Front de mer Démo", type: "Appartement", prix_partir: "900 000 DH", surface_min: 60, surface_max: 130, livraison: "T1 2026", statut: "Vendu", image: "" },
];

// --- CALENDRIER ---
export const MOCK_CALENDRIER: EvenementCalendrier[] = [
  { id: "ev1", titre: "Visite Appartement Réf. HM000001", type: "Visite", date: "2026-06-17", heure: "10:00", lieu: "Casablanca, Quartier Exemple", client: "Prospect Démo 4", bien_ref: "HM000001" },
  { id: "ev2", titre: "RDV signature mandat", type: "Signature", date: "2026-06-18", heure: "14:30", lieu: "Agence Principale", client: "Client Démo Un", bien_ref: "HM000002" },
  { id: "ev3", titre: "Réunion hebdo équipe", type: "Réunion", date: "2026-06-19", heure: "09:00", lieu: "Bureau Démo", client: "—", bien_ref: "—" },
  { id: "ev4", titre: "Appel de suivi lead", type: "Tâche", date: "2026-06-20", heure: "11:00", lieu: "Téléphone", client: "Prospect Démo 7", bien_ref: "—" },
  { id: "ev5", titre: "Visite Villa Démo", type: "Visite", date: "2026-06-21", heure: "16:00", lieu: "Marrakech, Route Exemple", client: "Prospect Démo 3", bien_ref: "HM000005" },
];
