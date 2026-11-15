import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ComiteService, TacheService } from '../../../core/services/api.services';
import { Comite, Tache, User } from '../../../core/models';
import { iconeComite } from '../../../shared/icons';

/** Mon comité : mission et charge de travail de chaque membre. */
@Component({
  selector: 'app-chef-comite-view',
  template: `
    <app-layout title="Mon comité" [subtitle]="comite ? 'Comité ' + comite.nom : ''">
      <div class="skeleton" style="height:160px" *ngIf="loading"></div>
      <div class="card" *ngIf="!loading && !comite"><app-empty icon="layers" title="Aucun comité assigné"></app-empty></div>

      <ng-container *ngIf="!loading && comite">
        <div class="card head">
          <span class="ico"><lucide-icon [name]="icone(comite.nom)" [size]="24"></lucide-icon></span>
          <div class="grow">
            <h2>Comité {{ comite.nom }}</h2>
            <p class="muted">{{ comite.description }}</p>
          </div>
          <a class="btn btn-secondary" routerLink="/chef-comite/membres"><lucide-icon name="users" [size]="16"></lucide-icon> Gérer l’équipe</a>
        </div>

        <div class="card mt">
          <div class="card-head"><div><div class="card-title">Charge de l’équipe</div><div class="card-sub">Tâches assignées à chaque membre</div></div></div>
          <div class="table-wrap" *ngIf="comite.membres?.length">
            <table class="table">
              <thead><tr><th>Membre</th><th>Assignées</th><th>En cours</th><th>En retard</th><th>Terminées</th></tr></thead>
              <tbody>
                <tr *ngFor="let m of comite.membres">
                  <td><div class="cell-user"><span class="avatar sm">{{ initiales(m.nom) }}</span><span><span class="name">{{ m.nom }}</span><br><span class="sub">{{ m.email }}</span></span></div></td>
                  <td>{{ de(m).length }}</td>
                  <td>{{ nb(m, 'EN_COURS') }}</td>
                  <td><span [class.red]="nb(m, 'EN_RETARD')">{{ nb(m, 'EN_RETARD') }}</span></td>
                  <td>{{ nb(m, 'TERMINEE') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <app-empty *ngIf="!comite.membres?.length" icon="users" title="Pas encore de membre" text="Acceptez des demandes d’adhésion pour constituer votre équipe."></app-empty>
        </div>
      </ng-container>
    </app-layout>
  `,
  styles: [`
    .head { display: flex; align-items: center; gap: 16px; padding: 20px; flex-wrap: wrap; }
    .ico { width: 52px; height: 52px; border-radius: 15px; display: grid; place-items: center; background: var(--brand-100); color: var(--brand); }
    .grow { flex: 1; min-width: 220px; }
    h2 { font-size: 19px; }
    .red { color: var(--danger); font-weight: 800; }
  `],
})
export class ChefComiteViewComponent implements OnInit {
  comite: Comite | null = null;
  taches: Tache[] = [];
  loading = true;

  constructor(private comites: ComiteService, private tachesSrv: TacheService) {}

  ngOnInit(): void {
    forkJoin({ comite: this.comites.getMonComite(), taches: this.tachesSrv.getAll() }).subscribe({
      next: r => { this.comite = r.comite; this.taches = r.taches; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  de(m: User): Tache[] { return this.taches.filter(t => t.membreId === m.id); }
  nb(m: User, s: string): number { return this.de(m).filter(t => t.statut === s).length; }
  icone(n: string): string { return iconeComite(n); }
  initiales(n: string): string { return n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2); }
}
