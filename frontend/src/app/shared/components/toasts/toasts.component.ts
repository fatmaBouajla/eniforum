import { Component } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toasts',
  template: `
    <div class="toasts" aria-live="polite">
      <div class="toast" *ngFor="let t of toast.toasts" [ngClass]="t.type">
        <lucide-icon [name]="t.type === 'success' ? 'circle-check' : t.type === 'error' ? 'circle-alert' : 'info'" [size]="18"></lucide-icon>
        <span>{{ t.message }}</span>
        <button class="close" (click)="toast.fermer(t.id)" aria-label="Fermer"><lucide-icon name="x" [size]="14"></lucide-icon></button>
      </div>
    </div>
  `,
  styles: [`
    .toasts { position: fixed; right: 20px; bottom: 20px; z-index: 1000; display: flex; flex-direction: column; gap: 8px; max-width: min(420px, calc(100vw - 40px)); }
    .toast { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 12px; font-size: 13px; font-weight: 600;
      background: var(--brand-900); color: #fff; box-shadow: var(--shadow-lg); animation: in .2s ease; }
    .toast.success lucide-icon { color: #6EE7A0; } .toast.error { background: #7F1D1D; } .toast.info lucide-icon { color: #7CC4F2; }
    .toast span { flex: 1; }
    .close { background: none; border: 0; color: rgba(255,255,255,.7); cursor: pointer; display: grid; }
    @keyframes in { from { transform: translateY(10px); opacity: 0; } }
  `],
})
export class ToastsComponent {
  constructor(public toast: ToastService) {}
}
