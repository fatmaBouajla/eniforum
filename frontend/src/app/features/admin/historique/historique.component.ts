import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface LigneEdition { edition: string; nom: string; statut: string; nbComites: number; }

/** Historique : toutes les éditions du Forum, clôturées ou non (lecture seule). */
@Component({
  selector: 'app-historique',
  template: `
    <app-layout title="Historique" subtitle="Les éditions passées restent consultables en lecture seule">
      <div class="alert alert-error" *ngIf="erreur"><lucide-icon name="circle-alert" [size]="18"></lucide-icon>{{ erreur }}</div>
      <div class="grid grid-3" *ngIf="!loading">
        <app-stat-card icon="calendar-days" label="Éditions" [value]="lignes.length"></app-stat-card>
        <app-stat-card icon="archive" tone="violet" label="Éditions clôturées" [value]="nbCloturees"></app-stat-card>
        <app-stat-card icon="layers" tone="green" label="Comités (toutes éditions)" [value]="totalComites"></app-stat-card>
      </div>
      <div class="card mt">
        <div class="card-head"><div><div class="card-title">Comparaison des éditions</div><div class="card-sub">De la plus récente à la plus ancienne</div></div></div>
        <div class="skeleton" style="height:160px;margin:16px" *ngIf="loading"></div>
        <div class="table-wrap" *ngIf="!loading && lignes.length">
          <table class="table">
            <thead><tr><th>Année</th><th>Édition</th><th>Comités</th><th>Statut</th></tr></thead>
            <tbody>
              <tr *ngFor="let l of lignes">
                <td class="strong">{{ l.edition }}</td>
                <td>{{ l.nom }}</td>
                <td>{{ l.nbComites }}</td>
                <td><app-statut-badge [statut]="l.statut"></app-statut-badge></td>
              </tr>
            </tbody>
          </table>
        </div>
        <app-empty *ngIf="!loading && !lignes.length" icon="history" title="Aucune édition" text="Les éditions apparaîtront ici dès leur création."></app-empty>
      </div>
      <div class="alert alert-info mt">
        <lucide-icon name="info" [size]="18"></lucide-icon>
        <span>Une édition clôturée (Édition du Forum › Clôturer) est archivée : ses comités, tâches et workshops ne peuvent plus être modifiés.</span>
      </div>
    </app-layout>
  `,
})
export class HistoriqueComponent implements OnInit {
  lignes: LigneEdition[] = [];
  loading = true;
  erreur = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<LigneEdition[]>(`${environment.apiUrl}/stats/editions`).subscribe({
      next: l => { this.lignes = l.sort((a, b) => (b.edition ?? '').localeCompare(a.edition ?? '')); this.loading = false; },
      error: (e: Error) => { this.erreur = e.message; this.loading = false; },
    });
  }

  get nbCloturees(): number { return this.lignes.filter(l => l.statut === 'CLOTURE').length; }
  get totalComites(): number { return this.lignes.reduce((s, l) => s + (l.nbComites || 0), 0); }
}
