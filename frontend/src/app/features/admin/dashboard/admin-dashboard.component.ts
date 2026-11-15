import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { StatistiquesService } from '../../../core/services/api.services';
import { KPIs, AvancementComite } from '../../../core/models';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
})
export class AdminDashboardComponent implements OnInit {
  kpis: KPIs | null = null;
  avancements: AvancementComite[] = [];
  loading = true;

  erreur = '';

  private chartComites: Chart | null = null;
  private chartTaches: Chart | null = null;

  constructor(private statsService: StatistiquesService) {}

  ngOnInit(): void {
    forkJoin({
      kpis: this.statsService.getKPIs(),
      av: this.statsService.getAvancementComites(),
    }).subscribe({
      next: ({ kpis, av }) => {
        this.kpis = kpis as KPIs;
        this.avancements = av;
        this.loading = false;
        setTimeout(() => this.buildCharts(), 50);
      },
      error: () => {
        this.kpis = null;
        this.avancements = [];
        this.erreur = 'Impossible de joindre le serveur : les données ne peuvent pas être affichées. Vérifiez que le backend est démarré.';
        this.loading = false;
      },
    });
  }

  private avData(): AvancementComite[] {
    return this.avancements ?? [];
  }

  buildCharts(): void {
    const barSrc = this.avData();
    const c1 = document.getElementById('chartComites') as HTMLCanvasElement;
    if (c1) {
      this.chartComites?.destroy();
      this.chartComites = new Chart(c1, {
        type: 'bar',
        data: {
          labels: barSrc.map(a => a.comiteNom),
          datasets: [{
            label: 'Avancement %',
            data: barSrc.map(a => a.avancement),
            backgroundColor: ['#10B981','#1E40AF','#F59E0B','#1E40AF','#F59E0B','#EF4444'],
            borderRadius: 8, barThickness: 32,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { min: 0, max: 100, ticks: { callback: (v) => v + '%' } } },
        },
      });
    }

    const c2 = document.getElementById('chartTaches') as HTMLCanvasElement;
    const k = this.kpis;
    if (!k) return;
    const term = k.tachesTerminees;
    const ret = k.tachesEnRetard;
    let enCours = k.tachesEnCours;
    let aFaire = k.tachesAFaire;
    if (enCours === undefined && aFaire === undefined) {
      const rest = Math.max(0, k.totalTaches - term - ret);
      enCours = Math.floor(rest / 2);
      aFaire = rest - enCours;
    } else {
      enCours = enCours ?? 0;
      aFaire = aFaire ?? Math.max(0, k.totalTaches - term - ret - enCours);
    }
    if (c2) {
      this.chartTaches?.destroy();
      this.chartTaches = new Chart(c2, {
        type: 'doughnut',
        data: {
          labels: ['À faire', 'En cours', 'Terminées', 'En retard'],
          datasets: [{
            data: [aFaire, enCours, term, ret],
            backgroundColor: ['#E2E8F0', '#1E40AF', '#10B981', '#EF4444'],
            borderWidth: 0, hoverOffset: 6,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 14 } } },
          cutout: '68%',
        },
      });
    }
  }

  get tachesPercent(): number {
    if (!this.kpis || !this.kpis.totalTaches) return 0;
    return Math.round((this.kpis.tachesTerminees / this.kpis.totalTaches) * 100);
  }
}
