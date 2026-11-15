import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, from, of } from 'rxjs';
import { catchError, concatMap } from 'rxjs/operators';
import { CandidatureCVService } from '../../../core/services/api.services';
import { CandidatureCV } from '../../../core/models';
import {
  AnalyseIA, CodeRecommandation, RECO_LABELS, libellePoste, lireAnalyse, lireDossier,
} from '../../../core/utils/analyse-ia';

/** Candidature enrichie pour l'affichage (analyse IA + infos du formulaire). */
interface Ligne {
  c: CandidatureCV;
  a: AnalyseIA;
  comite: string;
  poste: string;
  niveau: string;
}

const MAX_COMPARAISON = 3;

@Component({
  selector: 'app-module-ia',
  templateUrl: './module-ia.component.html',
  styleUrls: ['./module-ia.component.scss'],
})
export class ModuleIAComponent implements OnInit, OnDestroy {
  lignes: Ligne[] = [];
  loading = false;
  erreur = '';
  info = '';

  // Filtres
  recherche = '';
  filtreComite = '';
  filtrePoste = '';
  filtreStatut = 'EN_ATTENTE';
  filtreReco = '';

  // Interactions
  ouverts = new Set<number>();
  selection: number[] = [];
  showComparaison = false;
  analyseEnCours = new Set<number>();
  progression: { fait: number; total: number } | null = null;

  // Décisions
  aAccepter: Ligne | null = null;
  aRefuser: Ligne | null = null;
  motifRefus = '';
  decisionEnCours = false;

  readonly recoLabels = RECO_LABELS;
  readonly maxComparaison = MAX_COMPARAISON;
  private batch?: Subscription;

  constructor(private cvService: CandidatureCVService) {}

  ngOnInit(): void { this.charger(); }
  ngOnDestroy(): void { this.batch?.unsubscribe(); }

  // ------------------------------------------------------------ données
  charger(): void {
    this.loading = true;
    this.erreur = '';
    this.cvService.getAll().subscribe({
      next: list => {
        this.lignes = list.map(c => this.versLigne(c));
        this.loading = false;
      },
      error: (e: Error) => {
        this.lignes = [];
        this.erreur = `Impossible de charger les candidatures (${e.message}). Vérifiez que le backend est démarré.`;
        this.loading = false;
      },
    });
  }

  private versLigne(c: CandidatureCV): Ligne {
    const d = lireDossier(c.dossierComplet);
    return {
      c,
      a: lireAnalyse(c),
      comite: d['Comité'] ?? '',
      poste: libellePoste(c.posteVise),
      niveau: d['Niveau'] ? `${d['Niveau']}ᵉ année` : '',
    };
  }

  private remplacer(c: CandidatureCV): void {
    const i = this.lignes.findIndex(l => l.c.id === c.id);
    if (i >= 0) this.lignes[i] = this.versLigne(c);
  }

  // ------------------------------------------------------------ filtres & classement
  get comites(): string[] {
    return [...new Set(this.lignes.map(l => l.comite).filter(Boolean))].sort();
  }
  get postes(): string[] {
    return [...new Set(this.lignes.map(l => l.poste).filter(Boolean))].sort();
  }

  get classement(): Ligne[] {
    const q = this.recherche.trim().toLowerCase();
    return this.lignes
      .filter(l =>
        (!q || (l.c.candidatNom ?? '').toLowerCase().includes(q) || (l.c.candidatEmail ?? '').toLowerCase().includes(q)) &&
        (!this.filtreComite || l.comite === this.filtreComite) &&
        (!this.filtrePoste || l.poste === this.filtrePoste) &&
        (!this.filtreStatut || l.c.statut === this.filtreStatut) &&
        (!this.filtreReco || l.a.recommandation === this.filtreReco))
      .sort((x, y) => (y.a.score ?? -1) - (x.a.score ?? -1));
  }

  get stats() {
    const analysees = this.lignes.filter(l => l.a.analysee);
    const moyenne = analysees.length
      ? Math.round(analysees.reduce((s, l) => s + (l.a.score ?? 0), 0) / analysees.length)
      : null;
    return {
      total: this.lignes.length,
      analysees: analysees.length,
      aAnalyser: this.lignes.length - analysees.length,
      moyenne,
      prioriser: analysees.filter(l => l.a.recommandation === 'PRIORISER' && l.c.statut === 'EN_ATTENTE').length,
    };
  }

  reinitialiserFiltres(): void {
    this.recherche = ''; this.filtreComite = ''; this.filtrePoste = ''; this.filtreStatut = ''; this.filtreReco = '';
  }

  // ------------------------------------------------------------ analyse IA
  analyser(l: Ligne): void {
    this.analyseEnCours.add(l.c.id);
    this.cvService.analyserIA(l.c.id).subscribe({
      next: c => { this.remplacer(c); this.analyseEnCours.delete(l.c.id); },
      error: (e: Error) => { this.erreur = `Analyse impossible : ${e.message}`; this.analyseEnCours.delete(l.c.id); },
    });
  }

  /** Analyse une à une (le service IA n'est pas saturé et la progression reste visible). */
  analyserNonAnalysees(): void {
    const cibles = this.lignes.filter(l => !l.a.analysee || l.a.dimensions.length === 0);
    if (!cibles.length) { this.info = 'Toutes les candidatures sont déjà analysées avec la nouvelle IA.'; return; }
    this.info = '';
    this.progression = { fait: 0, total: cibles.length };
    this.batch = from(cibles).pipe(
      concatMap(l => {
        this.analyseEnCours.add(l.c.id);
        return this.cvService.analyserIA(l.c.id).pipe(catchError(() => of(null)));
      }),
    ).subscribe({
      next: c => {
        if (c) { this.remplacer(c); this.analyseEnCours.delete(c.id); }
        if (this.progression) this.progression.fait++;
      },
      complete: () => {
        this.analyseEnCours.clear();
        const total = this.progression?.total ?? 0;
        this.progression = null;
        this.info = `${total} candidature(s) analysée(s).`;
      },
    });
  }

  // ------------------------------------------------------------ détail & comparaison
  basculer(l: Ligne): void {
    this.ouverts.has(l.c.id) ? this.ouverts.delete(l.c.id) : this.ouverts.add(l.c.id);
  }

  estSelectionne(l: Ligne): boolean { return this.selection.includes(l.c.id); }

  basculerSelection(l: Ligne): void {
    if (this.estSelectionne(l)) {
      this.selection = this.selection.filter(id => id !== l.c.id);
    } else if (this.selection.length < MAX_COMPARAISON) {
      this.selection = [...this.selection, l.c.id];
    }
  }

  get aComparer(): Ligne[] {
    return this.selection
      .map(id => this.lignes.find(l => l.c.id === id))
      .filter((l): l is Ligne => !!l);
  }

  /** Libellés de toutes les dimensions présentes dans la comparaison (dans l'ordre). */
  get dimensionsComparees(): string[] {
    return [...new Set(this.aComparer.flatMap(l => l.a.dimensions.map(d => d.libelle)))];
  }

  dimension(l: Ligne, libelle: string) {
    return l.a.dimensions.find(d => d.libelle === libelle) ?? null;
  }

  /** Meilleur candidat de la comparaison pour une dimension (mise en valeur). */
  estMeilleur(l: Ligne, libelle: string): boolean {
    const vals = this.aComparer.map(x => this.dimension(x, libelle)?.pct ?? -1);
    const v = this.dimension(l, libelle)?.pct ?? -1;
    return v >= 0 && v === Math.max(...vals) && vals.filter(x => x === v).length === 1;
  }

  // ------------------------------------------------------------ décisions
  confirmerAcceptation(): void {
    const l = this.aAccepter;
    if (!l) return;
    this.decisionEnCours = true;
    this.cvService.accepter(l.c.id).subscribe({
      next: c => { this.remplacer(c); this.fermerDecision(); this.info = `Candidature de ${l.c.candidatNom} acceptée : compte créé et identifiants envoyés par email.`; },
      error: (e: Error) => { this.erreur = `Acceptation impossible : ${e.message}`; this.fermerDecision(); },
    });
  }

  confirmerRefus(): void {
    const l = this.aRefuser;
    if (!l || !this.motifRefus.trim()) return;
    this.decisionEnCours = true;
    this.cvService.refuser(l.c.id, this.motifRefus.trim()).subscribe({
      next: c => { this.remplacer(c); this.fermerDecision(); },
      error: (e: Error) => { this.erreur = `Refus impossible : ${e.message}`; this.fermerDecision(); },
    });
  }

  fermerDecision(): void {
    this.aAccepter = null; this.aRefuser = null; this.motifRefus = ''; this.decisionEnCours = false;
  }

  telecharger(l: Ligne): void {
    this.cvService.telechargerCv(l.c.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (l.c.fichierCV || 'cv.pdf').split(/[/\\]/).pop()?.replace(/^\d+_/, '') || 'cv.pdf';
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (e: Error) => { this.erreur = `Téléchargement impossible : ${e.message}`; },
    });
  }

  initiale(l: Ligne): string { return (l.c.candidatNom || '?').charAt(0).toUpperCase(); }
  recoLabel(code: CodeRecommandation | null): string { return code ? this.recoLabels[code] : 'Non analysé'; }
  trackById(_: number, l: Ligne): number { return l.c.id; }
}
