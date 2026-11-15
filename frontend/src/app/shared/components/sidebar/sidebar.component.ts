import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/api.services';
import { User } from '../../../core/models';
import { UiService } from '../../../core/services/ui.service';

interface NavItem {
  label: string; icon: string; route: string; badge?: number;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent implements OnInit {
  user: User | null = null;
  navItems: NavItem[] = [];
  unreadCount = 0;

  // Menu par rôle (icônes Lucide)
  private navMap: Record<string, NavItem[]> = {
    ADMIN: [
      { label: 'Tableau de bord', icon: 'layout-dashboard', route: '/admin/dashboard' },
      { label: 'Édition du Forum', icon: 'calendar-days', route: '/admin/forum-project' },
      { label: 'Utilisateurs', icon: 'users', route: '/admin/utilisateurs' },
      { label: 'Comités', icon: 'layers', route: '/admin/comites' },
      { label: 'Historique', icon: 'history', route: '/admin/historique' },
    ],
    COMITE_PILOTAGE: [
      { label: 'Tableau de bord', icon: 'layout-dashboard', route: '/pilotage/dashboard' },
      { label: 'Avancement', icon: 'trending-up', route: '/pilotage/avancement' },
      { label: 'Candidatures', icon: 'file-text', route: '/pilotage/cvs' },
      { label: 'Module IA', icon: 'sparkles', route: '/pilotage/ia' },
      { label: 'Rapports', icon: 'chart-column', route: '/pilotage/rapports' },
    ],
    COORDINATRICE: [
      { label: 'Tableau de bord', icon: 'layout-dashboard', route: '/coordinatrice/dashboard' },
      { label: 'Comités', icon: 'layers', route: '/coordinatrice/comites' },
      { label: 'Tâches', icon: 'list-todo', route: '/coordinatrice/taches' },
      { label: 'Workshops', icon: 'presentation', route: '/coordinatrice/workshops' },
      { label: 'Planning', icon: 'calendar-clock', route: '/coordinatrice/planning' },
    ],
    CHEF_COMITE: [
      { label: 'Tableau de bord', icon: 'layout-dashboard', route: '/chef-comite/dashboard' },
      { label: 'Mon comité', icon: 'layers', route: '/chef-comite/comite' },
      { label: 'Tâches', icon: 'list-todo', route: '/chef-comite/taches' },
      { label: 'Membres', icon: 'users', route: '/chef-comite/membres' },
      { label: 'Workshops', icon: 'presentation', route: '/chef-comite/workshops' },
    ],
    MEMBRE: [
      { label: 'Tableau de bord', icon: 'layout-dashboard', route: '/membre/dashboard' },
      { label: 'Mes tâches', icon: 'list-todo', route: '/membre/taches' },
      { label: 'Notifications', icon: 'bell', route: '/membre/notifications' },
    ],
  };

  readonly roleLabels: Record<string, string> = {
    ADMIN: 'Administrateur', COMITE_PILOTAGE: 'Comité de pilotage', COORDINATRICE: 'Coordinatrice',
    CHEF_COMITE: 'Chef de comité', MEMBRE: 'Membre',
  };

  constructor(
    private auth: AuthService,
    private notifService: NotificationService,
    private router: Router,
    public ui: UiService
  ) {}

  ngOnInit(): void {
    this.user = this.auth.currentUser;
    this.navItems = this.navMap[this.user?.role ?? ''] ?? [];
    this.loadUnread();
  }

  loadUnread(): void {
    this.notifService.getNonLues().subscribe({
      next: (n) => {
        this.unreadCount = n.length;
        const notifItem = this.navItems.find(i => i.label === 'Notifications');
        if (notifItem) notifItem.badge = this.unreadCount;
      },
      error: () => {}
    });
  }

  isActive(route: string): boolean { return this.router.url.startsWith(route); }

  logout(): void { this.auth.logout(); }

  get roleLabel(): string { return this.roleLabels[this.user?.role ?? ''] ?? ''; }

  get initials(): string {
    return this.user?.nom?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? 'U';
  }
}
