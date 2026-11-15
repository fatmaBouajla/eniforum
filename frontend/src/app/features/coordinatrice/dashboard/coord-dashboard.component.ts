import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Chart } from 'chart.js';
import { StatistiquesService, TacheService, WorkshopService } from '../../../core/services/api.services';
import { KPIs, Tache, Workshop } from '../../../core/models';
import { graphiqueTaches, joursAvant } from '../../../core/utils/graphiques';

interface Alerte { niveau: 'danger' | 'warning' | 'info'; icone: string; texte: string; lien: string; }

/** Tableau de bord de la coordinatrice : alertes calculées à partir des vraies données. */
@Component({
  selector: 'app-coord-dashboard',
  templateUrl: './coord-dashboard.component.html',
  styleUrls: ['./coord-dashboard.component.scss'],
})
export class CoordDashboardComponent implements OnInit, OnDestroy {
  @ViewChild('cTaches') cTaches?: ElementRef<HTMLCanvasElement>;
  kpis: KPIs | null = null;
  alertes: Alerte[] = [];
  aVenir: Workshop[] = [];
  aValider = 0;
  loading = true;
  erreur = '';
  private graphique: Chart | null = null;

  constructor(private stats: StatistiquesService, private taches: TacheService, private workshops: WorkshopService) {}

  ngOnInit(): void {
    forkJoin({ kpis: this.stats.getKPIs(), taches: this.taches.getAll(), ws: this.workshops.getAll() }).subscribe({
      next: r => {
        this.kpis = r.kpis;
        this.alertes = this.calculerAlertes(r.taches, r.ws);
        this.aValider = r.ws.filter(w => w.statut === 'PROPOSE').length;
        this.aVenir = r.ws.filter(w => w.statut === 'VALIDE' && new Date(w.dateHeure) >= new Date())
          .sort((a, b) => a.dateHeure.localeCompare(b.dateHeure)).slice(0, 4);
        this.loading = false;
        setTimeout(() => {
          this.graphique?.destroy();
          this.graphique = this.kpis ? graphiqueTaches(this.cTaches?.nativeElement ?? null, this.kpis) : null;
        });
      },
      error: (e: Error) => { this.erreur = e.message; this.loading = false; },
    });
  }

  ngOnDestroy(): void { this.graphique?.destroy(); }

  // Alertes : retards par comité, urgences proches, workshops à valider
  private calculerAlertes(taches: Tache[], ws: Workshop[]): Alerte[] {
    const alertes: Alerte[] = [];
    const retards = new Map<string, number>();
    taches.filter(t => t.statut === 'EN_RETARD').forEach(t => retards.set(t.comiteNom ?? '?', (retards.get(t.comiteNom ?? '?') ?? 0) + 1));
    retards.forEach((n, comite) => alertes.push({ niveau: 'danger', icone: 'clock',
      texte: `Comité ${comite} : ${n} tâche${n > 1 ? 's' : ''} en retard`, lien: '/coordinatrice/taches' }));
    taches.filter(t => t.priorite === 'URGENTE' && t.statut === 'A_FAIRE' && (joursAvant(t.dateFin) ?? 99) <= 7)
      .forEach(t => alertes.push({ niveau: 'warning', icone: 'flag',
        texte: `Tâche urgente non commencée : « ${t.titre} » (${t.comiteNom})`, lien: '/coordinatrice/taches' }));
    ws.filter(w => w.statut === 'PROPOSE').forEach(w => {
      const j = joursAvant(w.dateHeure?.slice(0, 10));
      alertes.push({ niveau: j !== null && j <= 14 ? 'warning' : 'info', icone: 'presentation',
        texte: `Workshop « ${w.titre} » à valider${j !== null && j >= 0 ? ` (dans ${j} j)` : ''}`, lien: '/coordinatrice/workshops' });
    });
    return alertes;
  }
}
