import { Component, OnInit } from '@angular/core';
import { TacheService, NotificationService } from '../../../core/services/api.services';
import { Tache, Notification } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-membre-dashboard',
  templateUrl: './membre-dashboard.component.html',
  styleUrls: ['./membre-dashboard.component.scss'],
})
export class MembreDashboardComponent implements OnInit {
  taches: Tache[] = [];
  notifications: Notification[] = [];

  erreur = '';

  constructor(
    private tacheService: TacheService,
    private notifService: NotificationService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.tacheService.getMesTaches().subscribe({
      next: t => this.taches = t,
      error: () => { this.taches = []; this.erreur = 'Impossible de joindre le serveur : les données ne peuvent pas être affichées. Vérifiez que le backend est démarré.'; }
    });
    this.notifService.getNonLues().subscribe({
      next: n => this.notifications = n.slice(0, 4),
      error: () => { this.notifications = []; }
    });
  }

  get userName(): string { return this.auth.currentUser?.nom?.split(' ')[0] || 'Utilisateur'; }
  get tachesEnCours():  Tache[] { return this.taches.filter(t => t.statut === 'EN_COURS'); }
  get tachesUrgentes(): Tache[] { return this.taches.filter(t => t.priorite === 'URGENTE' && t.statut !== 'TERMINEE'); }
  get tachesTerminees():number   { return this.taches.filter(t => t.statut === 'TERMINEE').length; }
  get tachesEnRetard(): number   { return this.taches.filter(t => t.statut === 'EN_RETARD').length; }

  typeIcon(type: string): string {
    return { RETARD:'⏰', ASSIGNATION:'📌', VALIDATION:'✅', ALERTE:'⚠️', INFO:'ℹ️' }[type] ?? 'ℹ️';
  }
}
