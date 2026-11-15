import { Component, Input } from '@angular/core';

/** Carte de chiffre clé (tableaux de bord). */
@Component({
  selector: 'app-stat-card',
  template: `
    <div class="stat card" [ngClass]="tone">
      <div class="stat-ico"><lucide-icon [name]="icon" [size]="20"></lucide-icon></div>
      <div class="stat-body">
        <div class="stat-label">{{ label }}</div>
        <div class="stat-val">{{ value }}</div>
        <div class="stat-sub" *ngIf="sub">{{ sub }}</div>
      </div>
    </div>
  `,
  styles: [`
    .stat { display: flex; gap: 14px; align-items: flex-start; padding: 18px; height: 100%; }
    .stat-ico { width: 40px; height: 40px; border-radius: 11px; display: grid; place-items: center; flex-shrink: 0;
      background: var(--brand-100); color: var(--brand); }
    .green .stat-ico { background: var(--green-100); color: var(--green); }
    .red .stat-ico { background: var(--danger-bg); color: var(--danger); }
    .amber .stat-ico { background: var(--warning-bg); color: var(--warning); }
    .violet .stat-ico { background: var(--violet-bg); color: var(--violet); }
    .stat-label { font-size: 12.5px; font-weight: 700; color: var(--text-3); }
    .stat-val { font-size: 26px; font-weight: 800; color: var(--brand-900); line-height: 1.15; margin-top: 2px; }
    .stat-sub { font-size: 12px; color: var(--text-3); margin-top: 2px; }
  `],
})
export class StatCardComponent {
  @Input() icon = 'gauge';
  @Input() value: string | number = '';
  @Input() label = '';
  @Input() sub = '';
  @Input() tone: 'blue' | 'green' | 'red' | 'amber' | 'violet' = 'blue';
}
