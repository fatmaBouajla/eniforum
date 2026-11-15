import { Component, OnInit } from '@angular/core';
import { NotificationService, TacheService } from '../../../core/services/api.services';
import { Notification, Tache } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';

/** Tableau de bord du membre : ses priorités du moment. */
@Component({
  selector: 'app-membre-dashboard',
  templateUrl: './membre-dashboard.component.html',
  styleUrls: ['./membre-dashboard.component.scss'],
})
export class MembreDashboardComponent implements OnInit {
  taches: Tache[] = [];
  notifications: Notification[] = [];
  loading = true;
  erreur = '';

  constructor(private tachesSrv: TacheService, private notifs: NotificationService, public auth: AuthService) {}

  ngOnInit(): void {
    this.tachesSrv.getMesTaches().subscribe({
      next: t => { this.taches = t; this.loading = false; },
      error: (e: Error) => { this.erreur = e.message; this.loading = false; },
    });
    this.notifs.getNonLues().subscribe({ next: n => this.notifications = n.slice(0, 4), error: () => {} });
  }

  get prenom(): string { return this.auth.currentUser?.nom?.split(' ')[0] ?? ''; }
  nb(s: string): number { return this.taches.filter(t => t.statut === s).length; }
  get avancement(): number { return this.taches.length ? Math.round(this.nb('TERMINEE') / this.taches.length * 100) : 0; }
  // Priorités : retards, urgences, puis échéances proches
  get priorites(): Tache[] {
    const rang = (t: Tache) => t.statut === 'EN_RETARD' ? 0 : t.priorite === 'URGENTE' ? 1 : 2;
    return this.taches.filter(t => t.statut !== 'TERMINEE')
      .sort((a, b) => rang(a) - rang(b) || a.dateFin.localeCompare(b.dateFin)).slice(0, 4);
  }
}
