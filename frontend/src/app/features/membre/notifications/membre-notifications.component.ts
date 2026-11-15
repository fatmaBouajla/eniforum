/* src/app/features/membre/notifications/membre-notifications.component.ts */
import { Component, OnInit } from '@angular/core';
import { NotificationService } from '../../../core/services/api.services';
import { Notification } from '../../../core/models';

@Component({
  selector: 'app-membre-notifications',
  templateUrl: './membre-notifications.component.html',
  styleUrls: ['./membre-notifications.component.scss'],
})
export class MembreNotificationsComponent implements OnInit {
  notifications: Notification[] = [];
  loading = false;

  erreur = '';

  constructor(private notifService: NotificationService) {}

  ngOnInit(): void {
    this.loading = true;
    this.notifService.getMesNotifications().subscribe({
      next: n => { this.notifications = n; this.loading = false; },
      error: () => { this.notifications = []; this.erreur = 'Impossible de joindre le serveur : les données ne peuvent pas être affichées. Vérifiez que le backend est démarré.'; this.loading = false; },
    });
  }

  marquerLu(n: Notification): void {
    if (n.lu) return;
    this.notifService.marquerLu(n.id).subscribe({
      next: () => n.lu = true,
      error: () => this.erreur = 'Impossible de marquer la notification comme lue.',
    });
  }

  marquerToutLu(): void {
    this.notifService.marquerToutLu().subscribe({
      next: () => this.notifications.forEach(n => n.lu = true),
      error: () => this.erreur = 'Impossible de marquer les notifications comme lues.',
    });
  }

  typeIcon(type: string): string {
    return { RETARD:'⏰', ASSIGNATION:'📌', VALIDATION:'✅', ALERTE:'⚠️', INFO:'ℹ️' }[type] ?? 'ℹ️';
  }

  typeBg(type: string): string {
    return { RETARD:'retard', ASSIGNATION:'info', VALIDATION:'success', ALERTE:'warning', INFO:'info' }[type] ?? 'info';
  }

  get unreadCount(): number { return this.notifications.filter(n => !n.lu).length; }
}
