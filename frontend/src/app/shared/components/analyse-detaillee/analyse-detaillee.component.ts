import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
import { CandidatureCVService } from '../../../core/services/api.services';
import { CandidatureCV } from '../../../core/models';

interface Point { texte: string; source: string | null; }
interface Analyse {
  points_forts: Point[];
  manques: Point[];
  questions_entretien: string[];
  sources: Record<string, string>;
  modele: string;
}

/** Analyse détaillée générée par le modèle de langage (RAG). */
@Component({
  selector: 'app-analyse-detaillee',
  templateUrl: './analyse-detaillee.component.html',
  styleUrls: ['./analyse-detaillee.component.scss'],
})
export class AnalyseDetailleeComponent implements OnChanges, OnDestroy {
  @Input() candidature!: CandidatureCV;
  etat: 'AUCUNE' | 'EN_COURS' | 'PRETE' | 'ERREUR' = 'AUCUNE';
  analyse: Analyse | null = null;
  erreur = '';
  source: string | null = null;
  private suivi?: Subscription;

  constructor(private cvs: CandidatureCVService) {}

  ngOnChanges(): void {
    this.source = null;
    this.lire(this.candidature);
    if (this.etat === 'EN_COURS') this.suivre();
  }

  ngOnDestroy(): void { this.suivi?.unsubscribe(); }

  lancer(): void {
    this.erreur = '';
    this.etat = 'EN_COURS';
    this.cvs.analyseDetaillee(this.candidature.id).subscribe({
      next: c => { this.lire(c); this.suivre(); },
      error: (e: Error) => { this.etat = 'ERREUR'; this.erreur = e.message; },
    });
  }

  // Interroge le serveur toutes les 4 s pendant 6 min au plus
  private suivre(): void {
    this.suivi?.unsubscribe();
    this.suivi = timer(4000, 4000).pipe(
      switchMap(() => this.cvs.getById(this.candidature.id)),
      takeWhile((c, i) => c.etatAnalyseDetaillee === 'EN_COURS' && i < 90, true),
    ).subscribe({
      next: c => this.lire(c),
      complete: () => {
        if (this.etat === 'EN_COURS') {
          this.etat = 'ERREUR';
          this.erreur = 'L’analyse prend plus de temps que prévu. Relancez-la dans un moment.';
        }
      },
    });
  }

  private lire(c: CandidatureCV): void {
    this.candidature.analyseDetaillee = c.analyseDetaillee;
    this.candidature.etatAnalyseDetaillee = c.etatAnalyseDetaillee;
    this.etat = c.etatAnalyseDetaillee ?? 'AUCUNE';
    this.analyse = null;
    if (!c.analyseDetaillee) return;
    try {
      const json = JSON.parse(c.analyseDetaillee);
      if (this.etat === 'ERREUR') this.erreur = json.erreur ?? 'Analyse impossible.';
      else this.analyse = json as Analyse;
    } catch {
      this.etat = 'ERREUR';
      this.erreur = 'Analyse illisible, relancez-la.';
    }
  }

  voir(source: string | null): void {
    this.source = this.source === source ? null : source;
  }
}
