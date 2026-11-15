import { Component, Input } from '@angular/core';

/** État vide : icône, titre, texte et action facultative (contenu projeté). */
@Component({
  selector: 'app-empty',
  template: `
    <div class="empty">
      <div class="empty-ico"><lucide-icon [name]="icon" [size]="26"></lucide-icon></div>
      <div class="empty-title">{{ title }}</div>
      <p class="muted" *ngIf="text">{{ text }}</p>
      <div class="empty-action"><ng-content></ng-content></div>
    </div>
  `,
  styles: [`
    .empty { text-align: center; padding: 44px 20px; }
    .empty-ico { width: 56px; height: 56px; margin: 0 auto 12px; border-radius: 16px; display: grid; place-items: center;
      background: var(--brand-50); color: var(--brand-500); }
    .empty-title { font-weight: 800; color: var(--brand-900); font-size: 15px; }
    p { max-width: 420px; margin: 4px auto 0; font-size: 13px; }
    .empty-action:not(:empty) { margin-top: 14px; }
  `],
})
export class EmptyComponent {
  @Input() icon = 'inbox';
  @Input() title = '';
  @Input() text = '';
}
