// ─── ENUMS ────────────────────────────────────────────────────
export type Role = 'ADMIN' | 'COMITE_PILOTAGE' | 'COORDINATRICE' | 'CHEF_COMITE' | 'MEMBRE';
export type StatutProjet = 'PLANIFICATION' | 'EN_COURS' | 'CLOTURE';
export type StatutTache = 'A_FAIRE' | 'EN_COURS' | 'TERMINEE' | 'EN_RETARD';
export type Priorite = 'NORMALE' | 'URGENTE';
export type StatutWorkshop = 'PROPOSE' | 'VALIDE' | 'REFUSE';
export type StatutCV = 'EN_ATTENTE' | 'ACCEPTE' | 'REFUSE';
export type TypeNotification = 'RETARD' | 'ASSIGNATION' | 'VALIDATION' | 'ALERTE' | 'INFO';

// ─── AUTH ─────────────────────────────────────────────────────
export interface LoginRequest  { email: string; motDePasse: string; }
export interface RegisterRequest { nom: string; email: string; motDePasse: string; role: Role; }

// Réponse RÉELLE du backend Spring Boot
export interface AuthResponse {
  token: string;
  type: string;   // "Bearer"
  email: string;
  role: string;
}

// ─── USER ─────────────────────────────────────────────────────
export interface User {
  id: number; nom: string; email: string; role: Role; actif: boolean;
}

// ─── FORUM PROJECT ────────────────────────────────────────────
export interface ForumProject {
  id: number; nom: string; edition: string;
  dateDebut: string; dateEvenement: string;
  lieu: string; description: string; statut: StatutProjet;
  comites?: Comite[];
}

// ─── COMITE ───────────────────────────────────────────────────
export interface Comite {
  id: number; nom: string; description: string;
  chef?: {
    id: number; nom: string; email: string;
    role: Role; actif: boolean;
  };
  chefId?: number; chefNom?: string;
  membres?: User[]; forumProjectId?: number;
  forumProject?: { id: number; nom: string; edition?: string; statut?: StatutProjet };
  nombreTaches?: number; avancement?: number;
}

// ─── TACHE ────────────────────────────────────────────────────
export interface Tache {
  id: number; titre: string; description: string;
  dateDebut: string; dateFin: string;
  priorite: Priorite; statut: StatutTache;
  comiteId: number; comiteNom?: string;
  membreId?: number; membreNom?: string;
  commentaires?: Commentaire[];
}

// ─── WORKSHOP ─────────────────────────────────────────────────
export interface Workshop {
  id: number; titre: string; description: string;
  intervenant: string; dateHeure: string;
  statut: StatutWorkshop;
  motifRefus?: string;
  comite?: { id: number; nom: string };
  proposePar?: { id: number; nom: string };
  comiteId?: number; comiteNom?: string;
}

export interface CandidatureCV {
  id: number; fichierCV: string; posteVise: string;
  scoreIA: number | null; statut: StatutCV;
  commentaire?: string; dateDepot: string;
  candidatId: number; candidatNom: string;
  candidatEmail?: string;
  dossierComplet?: string;
  justificationIA?: string;
  competencesExtraites?: string;
  dateAnalyseIA?: string;
  motDePasseProvisoire?: string;
  analyseDetaillee?: string;
  etatAnalyseDetaillee?: 'EN_COURS' | 'PRETE' | 'ERREUR' | null;
}

// ─── NOTIFICATION ─────────────────────────────────────────────
export interface Notification {
  id: number; message: string; lu: boolean;
  dateEnvoi: string; type: TypeNotification;
  destinationId?: number; tacheId?: number;
}

// ─── COMMENTAIRE ──────────────────────────────────────────────
export interface Commentaire {
  id: number; contenu: string; dateCreation: string;
  auteur?: { id: number; nom: string; role?: Role };
}

export interface KPIs {
  totalUtilisateurs: number; totalTaches: number;
  tachesTerminees: number; tachesEnRetard: number;
  totalWorkshops: number; workshopsValides: number;
  totalCandidatures: number; avancementGlobal: number;
  tachesAFaire: number; tachesEnCours: number;
  candidaturesAcceptees: number; totalComites: number;
}

export interface AvancementComite {
  comiteId?: number; comiteNom: string; total: number; terminees: number; avancement: number;
}
