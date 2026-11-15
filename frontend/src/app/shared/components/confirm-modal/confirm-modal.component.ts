import { Component, EventEmitter, Input, Output } from '@angular/core';

/** Demande de confirmation avant une action importante. */
@Component({
  selector: 'app-confirm-modal',
  template: `
    <app-modal [open]="open" [title]="title" size="sm" (close)="cancel.emit()">
      <div class="confirm">
        <div class="ico" [class.danger]="danger"><lucide-icon [name]="icon" [size]="22"></lucide-icon></div>
        <p>{{ message }}</p>
      </div>
      <div modal-footer>
        <button class="btn btn-secondary" (click)="cancel.emit()">Annuler</button>
        <button class="btn" [ngClass]="danger ? 'btn-danger-solid' : 'btn-primary'" (click)="confirm.emit()">{{ confirmLabel }}</button>
      </div>
    </app-modal>
  `,
  styles: [`
    .confirm { display: flex; gap: 14px; align-items: flex-start; }
    .ico { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; flex-shrink: 0; background: var(--brand-100); color: var(--brand); }
    .ico.danger { background: var(--danger-bg); color: var(--danger); }
    p { color: var(--text-2); font-size: 13.5px; margin-top: 2px; }
  `],
})
export class ConfirmModalComponent {
  @Input() open = false;
  @Input() title = 'Confirmer';
  @Input() message = '';
  @Input() icon = 'circle-alert';
  @Input() confirmLabel = 'Confirmer';
  @Input() danger = false;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
