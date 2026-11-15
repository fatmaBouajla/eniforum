import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CandidatureCVService } from '../../../core/services/api.services';
import { CandidatureCV } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';
import { libellePoste, lireDossier } from '../../../core/utils/analyse-ia';

/**
 * Décision sur une candidature : acceptation (création du compte) ou refus motivé.
 * Si l'email n'a pas pu partir, affiche une fois le mot de passe provisoire.
 */
@Component({
  selector: 'app-decision',
  template: `
    <app-modal [open]="mode === 'accepter'" title="Accepter la candidature" size="sm" (close)="fermer(null)">
      <p class="txt" *ngIf="candidature">
        Un compte <b>{{ poste }}</b><ng-container *ngIf="comite"> du comité <b>{{ comite }}</b></ng-container>
        sera créé pour <b>{{ candidature.candidatNom }}</b>, et ses identifiants lui seront envoyés à
        <b>{{ candidature.candidatEmail }}</b>.
      </p>
      <div modal-footer>
        <button class="btn btn-secondary" (click)="fermer(null)">Annuler</button>
        <button class="btn btn-success" (click)="accepter()" [disabled]="envoi"><lucide-icon name="check" [size]="16"></lucide-icon> Accepter</button>
      </div>
    </app-modal>

    <app-modal [open]="mode === 'refuser'" title="Refuser la candidature" (close)="fermer(null)">
      <div class="field">
        <label for="motif">Motif du refus <span class="req">*</span></label>
        <textarea id="motif" class="textarea" rows="4" [(ngModel)]="motif"
          placeholder="Ex. : profil intéressant mais peu d’expérience en design graphique."></textarea>
        <span class="hint">Le motif est transmis au candidat par email.</span>
      </div>
      <div modal-footer>
        <button class="btn btn-secondary" (click)="fermer(null)">Annuler</button>
        <button class="btn btn-danger-solid" (click)="refuser()" [disabled]="!motif.trim() || envoi">Confirmer le refus</button>
      </div>
    </app-modal>

    <app-modal [open]="!!identifiants" title="Compte créé" size="sm" (close)="identifiants = null">
      <div class="alert alert-warning">
        <lucide-icon name="triangle-alert" [size]="18"></lucide-icon>
        <span>L’email n’a pas pu être envoyé. Transmettez ces identifiants au candidat : ils ne seront plus affichés.</span>
      </div>
      <dl class="kv" *ngIf="identifiants">
        <dt>Email</dt><dd class="strong">{{ identifiants.email }}</dd>
        <dt>Mot de passe</dt><dd><code>{{ identifiants.mdp }}</code></dd>
      </dl>
      <div modal-footer>
        <button class="btn btn-secondary" (click)="copier()"><lucide-icon name="clipboard-list" [size]="16"></lucide-icon> Copier</button>
        <button class="btn btn-primary" (click)="identifiants = null">J’ai noté</button>
      </div>
    </app-modal>
  `,
  styles: [`
    .txt { color: var(--text-2); }
    code { font-size: 15px; font-weight: 700; padding: 3px 8px; border-radius: 6px; background: var(--surface-2); border: 1px solid var(--border); }
  `],
})
export class DecisionComponent implements OnChanges {
  @Input() candidature: CandidatureCV | null = null;
  @Input() mode: 'accepter' | 'refuser' | null = null;
  @Output() termine = new EventEmitter<CandidatureCV | null>();
  motif = '';
  envoi = false;
  identifiants: { email: string; mdp: string } | null = null;

  constructor(private cvs: CandidatureCVService, private toast: ToastService) {}

  ngOnChanges(): void { this.motif = ''; }

  get poste(): string { return libellePoste(this.candidature?.posteVise).toLowerCase(); }
  get comite(): string { return lireDossier(this.candidature?.dossierComplet)['Comité'] ?? ''; }

  accepter(): void {
    if (!this.candidature) return;
    this.envoi = true;
    this.cvs.accepter(this.candidature.id).subscribe({
      next: c => {
        this.envoi = false;
        if (c.motDePasseProvisoire) this.identifiants = { email: c.candidatEmail ?? '', mdp: c.motDePasseProvisoire };
        this.toast.success(`Candidature de ${c.candidatNom} acceptée`);
        this.fermer(c);
      },
      error: (e: Error) => { this.envoi = false; this.toast.error(e.message); },
    });
  }

  refuser(): void {
    if (!this.candidature) return;
    this.envoi = true;
    this.cvs.refuser(this.candidature.id, this.motif.trim()).subscribe({
      next: c => { this.envoi = false; this.toast.success('Candidature refusée'); this.fermer(c); },
      error: (e: Error) => { this.envoi = false; this.toast.error(e.message); },
    });
  }

  copier(): void {
    if (!this.identifiants) return;
    navigator.clipboard?.writeText(`Email : ${this.identifiants.email}\nMot de passe : ${this.identifiants.mdp}`)
      .then(() => this.toast.success('Identifiants copiés'));
  }

  fermer(c: CandidatureCV | null): void { this.termine.emit(c); }
}
