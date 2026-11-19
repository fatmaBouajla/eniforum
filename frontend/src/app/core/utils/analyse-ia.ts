import { CandidatureCV } from '../models';

/** Analyse IA d'une candidature. La justification du service IA contient
 *  une ligne par rubrique : « Rubrique : contenu ». */
export interface DimensionScore { libelle: string; points: number; max: number; pct: number; }

export type CodeRecommandation = 'PRIORISER' | 'ENTRETIEN' | 'RESERVE';

export interface AnalyseIA {
  /** false si le CV n'a pas été analysé (service IA indisponible, fichier absent). */
  analysee: boolean;
  score: number | null;
  recommandation: CodeRecommandation | null;
  synthese: string;
  pointsForts: string[];
  manquantes: string[];
  aVerifier: string[];
  dimensions: DimensionScore[];
  competences: string[];
  moteur: string;
  texteBrut: string;
}

export const RECO_LABELS: Record<CodeRecommandation, string> = {
  PRIORISER: 'Profil à prioriser',
  ENTRETIEN: 'À rencontrer en entretien',
  RESERVE: 'Moins adapté au poste',
};

/** Messages du backend quand l'IA n'a pas tourné (score de repli non significatif). */
const MESSAGES_REPLI = ['service d\'analyse ia indisponible', 'fichier cv introuvable'];

function splitList(v: string | undefined, sep: RegExp): string[] {
  return (v ?? '').split(sep).map(x => x.trim()).filter(Boolean);
}

export function lireAnalyse(c: Pick<CandidatureCV, 'scoreIA' | 'justificationIA' | 'competencesExtraites'>): AnalyseIA {
  const brut = (c.justificationIA ?? '').trim();
  const rubriques: Record<string, string> = {};
  for (const ligne of brut.split(/\r?\n/)) {
    const i = ligne.indexOf(' : ');
    if (i > 0) rubriques[ligne.slice(0, i).trim().toLowerCase()] = ligne.slice(i + 3).trim();
  }

  const repli = MESSAGES_REPLI.some(m => brut.toLowerCase().startsWith(m));
  const structuree = 'recommandation' in rubriques;
  const analysee = c.scoreIA != null && !repli && (structuree || brut.length > 0);

  const dimensions: DimensionScore[] = splitList(rubriques['détail du score'], /\s*\|\s*/)
    .map(part => {
      const m = part.match(/^(.*)\s(\d+(?:[.,]\d+)?)\/(\d+)$/);
      if (!m) return null;
      const points = parseFloat(m[2].replace(',', '.'));
      const max = parseInt(m[3], 10);
      return { libelle: m[1].trim(), points, max, pct: max ? Math.round((points / max) * 100) : 0 };
    })
    .filter((d): d is DimensionScore => d !== null);

  const code = (rubriques['recommandation'] ?? '').toUpperCase();
  let recommandation: CodeRecommandation | null =
    code === 'PRIORISER' || code === 'ENTRETIEN' || code === 'RESERVE' ? code : null;
  if (!recommandation && analysee && c.scoreIA != null) {
    // Justification sans rubriques : recommandation déduite du score
    recommandation = c.scoreIA >= 70 ? 'PRIORISER' : c.scoreIA >= 50 ? 'ENTRETIEN' : 'RESERVE';
  }

  return {
    analysee,
    score: analysee ? c.scoreIA : null,
    recommandation: analysee ? recommandation : null,
    synthese: rubriques['synthèse'] ?? (structuree ? '' : brut),
    pointsForts: splitList(rubriques['points forts'], / ; /)
      .filter(p => !p.startsWith('aucun point fort')),
    manquantes: splitList(rubriques['compétences manquantes'], /\s*,\s*/),
    aVerifier: splitList(rubriques['points à vérifier'], / ; /),
    dimensions,
    competences: splitList(c.competencesExtraites, /\s*,\s*/),
    moteur: rubriques['moteur'] ?? '',
    texteBrut: brut,
  };
}

/** Infos du formulaire de candidature (champ dossierComplet : « Clé:valeur | Clé:valeur »). */
export function lireDossier(dossier: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (dossier ?? '').split('|')) {
    const i = part.indexOf(':');
    if (i <= 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k && v && v !== '-' && v !== 'null') out[k] = v;
  }
  return out;
}

export function libellePoste(posteVise: string | undefined): string {
  const p = (posteVise ?? '').toUpperCase();
  if (p === 'CHEF_COMITE') return 'Chef de comité';
  if (p === 'MEMBRE') return 'Membre';
  if (p.includes('COORDINAT')) return 'Coordinatrice générale';
  return posteVise ?? '';
}
