import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Chart } from 'chart.js';
import { ForumProjectService, StatistiquesService } from '../../../core/services/api.services';
import { AvancementComite, ForumProject, KPIs } from '../../../core/models';
import { graphiqueAvancement, graphiqueTaches, joursAvant } from '../../../core/utils/graphiques';
import { iconeComite } from '../../../shared/icons';

/** Tableau de bord de l'administration : vue globale de l'édition en cours. */
@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  @ViewChild('cAvancement') cAvancement?: ElementRef<HTMLCanvasElement>;
  @ViewChild('cTaches') cTaches?: ElementRef<HTMLCanvasElement>;

  kpis: KPIs | null = null;
  avancements: AvancementComite[] = [];
  edition: ForumProject | null = null;
  loading = true;
  erreur = '';
  private graphiques: (Chart | null)[] = [];

  constructor(private stats: StatistiquesService, private forums: ForumProjectService) {}

  ngOnInit(): void {
    forkJoin({
      kpis: this.stats.getKPIs(),
      av: this.stats.getAvancementComites(),
      edition: this.forums.getCurrent().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ kpis, av, edition }) => {
        this.kpis = kpis;
        this.avancements = av;
        this.edition = edition;
        this.loading = false;
        setTimeout(() => this.dessiner());
      },
      error: (e: Error) => { this.erreur = e.message; this.loading = false; },
    });
  }

  ngOnDestroy(): void { this.graphiques.forEach(g => g?.destroy()); }

  private dessiner(): void {
    this.graphiques.forEach(g => g?.destroy());
    this.graphiques = [
      graphiqueAvancement(this.cAvancement?.nativeElement ?? null, this.avancements),
      this.kpis ? graphiqueTaches(this.cTaches?.nativeElement ?? null, this.kpis) : null,
    ];
  }

  get pourcentTaches(): number {
    return this.kpis?.totalTaches ? Math.round(this.kpis.tachesTerminees / this.kpis.totalTaches * 100) : 0;
  }
  get jours(): number | null { return joursAvant(this.edition?.dateEvenement); }
  icone(nom: string): string { return iconeComite(nom); }
  ton(p: number): string { return p >= 70 ? 'high' : p >= 40 ? 'mid' : 'low'; }
}
