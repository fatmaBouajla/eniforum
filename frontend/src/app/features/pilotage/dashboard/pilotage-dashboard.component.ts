/* src/app/features/pilotage/dashboard/pilotage-dashboard.component.ts */
import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { StatistiquesService, TacheService } from '../../../core/services/api.services';
import { KPIs, AvancementComite, Tache } from '../../../core/models';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-pilotage-dashboard',
  templateUrl: './pilotage-dashboard.component.html',
  styleUrls: ['./pilotage-dashboard.component.scss'],
})
export class PilotageDashboardComponent implements OnInit {
  kpis: KPIs | null = null;
  avancements: AvancementComite[] = [];
  tachesRetard: Tache[] = [];

  erreur = '';

  private chartInstance: Chart | null = null;


  constructor(private stats: StatistiquesService, private tacheService: TacheService) {}

  ngOnInit(): void {
    forkJoin({
      kpis: this.stats.getKPIs(),
      av: this.stats.getAvancementComites(),
      retard: this.tacheService.getAll({ statut: 'EN_RETARD' }),
    }).subscribe({
      next: ({ kpis, av, retard }) => {
        this.kpis = kpis;
        this.avancements = av;
        this.tachesRetard = (retard ?? []).slice(0, 5);
        setTimeout(() => this.buildChart(), 50);
      },
      error: () => {
        this.kpis = null;
        this.avancements = [];
        this.tachesRetard = [];
        this.erreur = 'Impossible de joindre le serveur : les données ne peuvent pas être affichées. Vérifiez que le backend est démarré.';
      },
    });
  }

  private chartData(): AvancementComite[] {
    return this.avancements ?? [];
  }

  buildChart(): void {
    const el = document.getElementById('chartAv') as HTMLCanvasElement;
    if (!el) return;
    const src = this.chartData();
    this.chartInstance?.destroy();
    this.chartInstance = new Chart(el, {
      type: 'bar',
      data: {
        labels: src.map(a => a.comiteNom),
        datasets: [
          { label: 'Terminées', data: src.map(a => a.terminees), backgroundColor: '#10B981', borderRadius: 6 },
          {
            label: 'Restantes',
            data: src.map(a => (a.total ?? 0) - a.terminees),
            backgroundColor: '#F1F5F9',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true } } },
        scales: { x: { stacked: true }, y: { stacked: true } },
      },
    });
  }

  statusColor(s: string): string {
    return { A_FAIRE:'a-faire',EN_COURS:'en-cours',TERMINEE:'terminee',EN_RETARD:'en-retard' }[s] ?? '';
  }
}
