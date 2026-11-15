import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Commentaire } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';

/** Fil de commentaires d'une tâche (fenêtre). */
@Component({
  selector: 'app-commentaires',
  template: `
    <app-modal [open]="!!tacheId" [title]="'Commentaires'" [subtitle]="titre" (close)="close.emit()">
      <div class="skeleton" style="height:80px" *ngIf="chargement"></div>
      <div class="fil" *ngIf="!chargement">
        <app-empty *ngIf="!commentaires.length" icon="message-square" title="Aucun commentaire" text="Partagez un point d’avancement ou une difficulté."></app-empty>
        <div class="msg" *ngFor="let c of commentaires" [class.moi]="c.auteur?.id === moiId">
          <span class="avatar sm">{{ initiales(c.auteur?.nom) }}</span>
          <div class="bulle">
            <div class="meta"><b>{{ c.auteur?.nom || 'Utilisateur' }}</b> · {{ c.dateCreation | date:'d MMM à HH:mm' }}</div>
            <div>{{ c.contenu }}</div>
          </div>
        </div>
      </div>
      <div modal-footer class="saisie">
        <input class="input" [(ngModel)]="texte" placeholder="Écrire un commentaire…" (keydown.enter)="envoyer()" aria-label="Nouveau commentaire">
        <button class="btn btn-primary" (click)="envoyer()" [disabled]="!texte.trim() || envoi"><lucide-icon name="send" [size]="16"></lucide-icon></button>
      </div>
    </app-modal>
  `,
  styles: [`
    .fil { display: flex; flex-direction: column; gap: 12px; max-height: 50vh; }
    .msg { display: flex; gap: 10px; align-items: flex-start; }
    .msg.moi { flex-direction: row-reverse; }
    .bulle { background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 8px 12px; font-size: 13.5px; max-width: 80%; }
    .moi .bulle { background: var(--brand-50); border-color: #CFE3F5; }
    .meta { font-size: 11.5px; color: var(--text-3); margin-bottom: 2px; }
    .saisie { width: 100%; display: flex; gap: 8px; }
    .saisie .input { flex: 1; }
  `],
})
export class CommentairesComponent implements OnChanges {
  @Input() tacheId: number | null = null;
  @Input() titre = '';
  @Output() close = new EventEmitter<void>();
  @Output() ajoute = new EventEmitter<void>();
  commentaires: Commentaire[] = [];
  chargement = false;
  texte = '';
  envoi = false;

  constructor(private http: HttpClient, private auth: AuthService) {}

  get moiId(): number | undefined { return this.auth.currentUser?.id; }

  ngOnChanges(): void {
    this.texte = '';
    if (!this.tacheId) return;
    this.chargement = true;
    this.http.get<Commentaire[]>(this.url).subscribe({
      next: c => { this.commentaires = c; this.chargement = false; },
      error: () => { this.commentaires = []; this.chargement = false; },
    });
  }

  envoyer(): void {
    if (!this.texte.trim() || !this.tacheId) return;
    this.envoi = true;
    this.http.post<Commentaire>(this.url, { contenu: this.texte.trim() }).subscribe({
      next: c => { this.commentaires = [...this.commentaires, c]; this.texte = ''; this.envoi = false; this.ajoute.emit(); },
      error: () => { this.envoi = false; },
    });
  }

  private get url(): string { return `${environment.apiUrl}/taches/${this.tacheId}/commentaires`; }
  initiales(n?: string): string { return (n || '?').split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2); }
}
