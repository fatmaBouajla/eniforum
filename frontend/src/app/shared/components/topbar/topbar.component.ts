import { Component, HostListener, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '../../../core/services/api.services';
import { AuthService } from '../../../core/services/auth.service';
import { Notification } from '../../../core/models';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss'],
})
export class TopbarComponent implements OnInit {
  @Input() title = '';
  @Input() subtitle = '';

  notifications: Notification[] = [];
  showNotifs = false;
  unreadCount = 0;

  constructor(
    private notifService: NotificationService,
    public auth: AuthService,
    private router: Router,
    public ui: UiService
  ) {}

  ngOnInit(): void { this.loadNotifs(); }

  toggleNotifs(ev: Event): void {
    ev.stopPropagation();
    this.showNotifs = !this.showNotifs;
  }

  /** Ferme le panneau de notifications au clic ailleurs ou avec Échap. */
  @HostListener('document:click')
  @HostListener('document:keydown.escape')
  closeNotifs(): void { this.showNotifs = false; }

  loadNotifs(): void {
    this.notifService.getNonLues().subscribe({
      next: (n) => { this.notifications = n.slice(0, 5); this.unreadCount = n.length; },
      error: () => {}
    });
  }

  markRead(id: number): void {
    this.notifService.marquerLu(id).subscribe(() => this.loadNotifs());
  }

  markAllRead(): void {
    this.notifService.marquerToutLu().subscribe(() => { this.notifications = []; this.unreadCount = 0; });
  }

  get userInitials(): string {
    return this.auth.currentUser?.nom?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? 'U';
  }

  // Icône par type de notification
  typeIcon(type: string): string {
    const map: Record<string, string> = {
      TACHE_ASSIGNEE: 'list-todo', TACHE_EN_RETARD: 'clock', WORKSHOP_VALIDE: 'circle-check',
      WORKSHOP_REFUSE: 'circle-x', CANDIDATURE_MISE_A_JOUR: 'file-text',
    };
    return map[type] ?? 'bell';
  }
}
