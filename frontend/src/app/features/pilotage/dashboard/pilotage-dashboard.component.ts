import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Chart } from 'chart.js';
import { CandidatureCVService, StatistiquesService, TacheService } from '../../../core/services/api.services';
import { AvancementComite, CandidatureCV, KPIs, Tache } from '../../../core/models';
import { graphiqueTermineesRestantes } from '../../../core/utils/graphiques';
import { AnalyseIA, RECO_LABELS, libellePoste, lireAnalyse, lireDossier } from '../../../core/utils/analyse-ia';

/** Tableau de bord du comité de pilotage : supervision et candidatures à traiter. */
@Component({
  selector: 'app-pilotage-dashboard',
  templateUrl: './pilotage-dashboard.component.html',
  styleUrls: ['./pilotage-dashboard.component.scss'],
})
export class PilotageDashboardComponent implements OnInit, OnDestroy {
  @ViewChild('cComites') cComites?: ElementRef<HTMLCanvasElement>;
  kpis: KPIs | null = null;
  avancements: AvancementComite[] = [];
  retards: Tache[] = [];
  aTraiter: { c: CandidatureCV; a: AnalyseIA; comite: string }[] = [];
  enAttente = 0;
  loading = true;
  erreur = '';
  readonly reco = RECO_LABELS;
  private graphique: Chart | null = null;

  constructor(private stats: StatistiquesService, private taches: TacheService, private cvs: CandidatureCVService) {}

  ngOnInit(): void {
    forkJoin({
      kpis: this.stats.getKPIs(),
      av: this.stats.getAvancementComites(),
      retards: this.taches.getAll('EN_RETARD'),
      cvs: this.cvs.getAll(),
    }).subscribe({
      next: r => {
        this.kpis = r.kpis;
        this.avancements = r.av;
        this.retards = r.retards.slice(0, 6);
        const attente = r.cvs.filter(c => c.statut === 'EN_ATTENTE');
        this.enAttente = attente.length;
        // Les candidatures les mieux notées par l'IA en premier
        this.aTraiter = attente
          .map(c => ({ c, a: lireAnalyse(c), comite: lireDossier(c.dossierComplet)['Comité'] ?? '' }))
          .sort((x, y) => (y.a.score ?? -1) - (x.a.score ?? -1))
          .slice(0, 4);
        this.loading = false;
        setTimeout(() => {
          this.graphique?.destroy();
          this.graphique = graphiqueTermineesRestantes(this.cComites?.nativeElement ?? null, this.avancements);
        });
      },
      error: (e: Error) => { this.erreur = e.message; this.loading = false; },
    });
  }

  ngOnDestroy(): void { this.graphique?.destroy(); }

  poste(p: string): string { return libellePoste(p); }
  initiale(n: string): string { return (n || '?').charAt(0).toUpperCase(); }
}
