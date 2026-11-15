import { Injectable } from '@angular/core';

/** État d'interface partagé entre la barre latérale, la barre du haut et le layout. */
@Injectable({ providedIn: 'root' })
export class UiService {
  /** Barre latérale réduite (bureau). Mémorisée entre les sessions. */
  collapsed = this.readCollapsed();
  /** Menu ouvert sur mobile (< 900px). */
  mobileNavOpen = false;

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
    try { localStorage.setItem('ui.sidebarCollapsed', String(this.collapsed)); } catch { /* ignore */ }
  }

  toggleMobileNav(): void { this.mobileNavOpen = !this.mobileNavOpen; }
  closeMobileNav(): void { this.mobileNavOpen = false; }

  private readCollapsed(): boolean {
    try { return localStorage.getItem('ui.sidebarCollapsed') === 'true'; } catch { return false; }
  }
}
