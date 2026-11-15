import { Component, Input } from '@angular/core';

/** Anneau de score 0-100 (vert ≥ 70, orange ≥ 50, rouge sinon ; gris si non analysé). */
@Component({
  selector: 'app-score-ring',
  template: `
    <div class="ring" [style.width.px]="size" [style.height.px]="size"
         [attr.aria-label]="score == null ? 'Non analysé' : 'Score IA ' + score + ' sur 100'" role="img">
      <svg [attr.viewBox]="'0 0 36 36'">
        <circle cx="18" cy="18" r="15.9" class="track"></circle>
        <circle *ngIf="score != null" cx="18" cy="18" r="15.9" class="bar" [ngClass]="tone"
                [attr.stroke-dasharray]="dash"></circle>
      </svg>
      <div class="val" [style.font-size.px]="size * 0.3">
        <ng-container *ngIf="score != null; else na">{{ score | number:'1.0-0' }}</ng-container>
        <ng-template #na><span class="na">–</span></ng-template>
      </div>
    </div>
  `,
  styles: [`
    .ring { position: relative; flex-shrink: 0; }
    svg { width: 100%; height: 100%; transform: rotate(-90deg); }
    circle { fill: none; stroke-width: 3.2; }
    .track { stroke: #E2E8F0; }
    .bar { stroke-linecap: round; transition: stroke-dasharray .6s ease; }
    .high { stroke: #059669; } .mid { stroke: #D97706; } .low { stroke: #DC2626; }
    .val { position: absolute; inset: 0; display: grid; place-items: center; font-weight: 800; color: #0F172A; }
    .na { color: #94A3B8; }
  `],
})
export class ScoreRingComponent {
  @Input() score: number | null = null;
  @Input() size = 56;

  get tone(): string {
    const s = this.score ?? 0;
    return s >= 70 ? 'high' : s >= 50 ? 'mid' : 'low';
  }
  get dash(): string {
    const pct = Math.max(0, Math.min(100, this.score ?? 0));
    return `${pct} ${100 - pct}`;
  }
}
