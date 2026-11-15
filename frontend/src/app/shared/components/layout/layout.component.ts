import { Component, Input } from '@angular/core';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-layout',
  template: `
    <div class="app-shell">
      <app-sidebar></app-sidebar>
      <div class="nav-backdrop" *ngIf="ui.mobileNavOpen" (click)="ui.closeMobileNav()"></div>
      <div class="page-wrap" [class.collapsed]="ui.collapsed">
        <app-topbar [title]="title" [subtitle]="subtitle"></app-topbar>
        <main class="page-content">
          <ng-content></ng-content>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .app-shell { display: flex; min-height: 100vh; background: var(--bg); }
    .page-wrap { flex: 1; min-width: 0; margin-left: 252px; display: flex; flex-direction: column; transition: margin .25s ease; }
    .page-wrap.collapsed { margin-left: 72px; }
    .page-content { flex: 1; padding: 24px 28px 40px; max-width: 1360px; width: 100%; margin: 0 auto; }
    .nav-backdrop { display: none; }
    @media (max-width: 900px) {
      .page-wrap, .page-wrap.collapsed { margin-left: 0; }
      .page-content { padding: 16px; }
      .nav-backdrop { display: block; position: fixed; inset: 0; background: rgba(10,25,47,.4); z-index: 90; }
    }
  `]
})
export class LayoutComponent {
  @Input() title = '';
  @Input() subtitle = '';
  constructor(public ui: UiService) {}
}
