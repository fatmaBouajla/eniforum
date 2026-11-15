import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

/** Fenêtre modale commune. Pied de fenêtre : <div modal-footer>…</div>. */
@Component({
  selector: 'app-modal',
  template: `
    <div class="overlay" *ngIf="open" (mousedown)="close.emit()">
      <div class="modal" [ngClass]="size" (mousedown)="$event.stopPropagation()" role="dialog" [attr.aria-label]="title">
        <div class="modal-head">
          <div>
            <h3>{{ title }}</h3>
            <p class="muted small" *ngIf="subtitle">{{ subtitle }}</p>
          </div>
          <button class="icon-btn" type="button" (click)="close.emit()" aria-label="Fermer">
            <lucide-icon name="x" [size]="18"></lucide-icon>
          </button>
        </div>
        <div class="modal-body"><ng-content></ng-content></div>
        <div class="modal-foot"><ng-content select="[modal-footer]"></ng-content></div>
      </div>
    </div>
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; z-index: 500; background: rgba(10, 25, 47, .45);
      display: flex; align-items: center; justify-content: center; padding: 16px; animation: fade .15s ease; }
    .modal { width: min(560px, 100%); max-height: calc(100vh - 32px); display: flex; flex-direction: column;
      background: var(--surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); animation: up .18s ease; }
    .modal.lg { width: min(860px, 100%); } .modal.xl { width: min(1100px, 100%); } .modal.sm { width: min(420px, 100%); }
    .modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 18px 20px 14px; border-bottom: 1px solid var(--border); }
    .modal-head h3 { font-size: 16.5px; }
    .modal-body { padding: 20px; overflow: auto; }
    .modal-foot { display: flex; gap: 8px; justify-content: flex-end; padding: 14px 20px; border-top: 1px solid var(--border); }
    .modal-foot:empty { display: none; }
    @keyframes fade { from { opacity: 0; } } @keyframes up { from { transform: translateY(8px); opacity: 0; } }
  `],
})
export class ModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() subtitle = '';
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Output() close = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  echap(): void { if (this.open) this.close.emit(); }
}
