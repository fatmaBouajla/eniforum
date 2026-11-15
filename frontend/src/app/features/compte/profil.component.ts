import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';

/** Mon profil : informations du compte et changement de mot de passe. */
@Component({
  selector: 'app-profil',
  template: `
    <app-layout title="Mon profil" subtitle="Vos informations et la sécurité de votre compte">
      <div class="grid grid-2 top">
        <div class="card">
          <div class="card-head"><div class="card-title">Informations</div></div>
          <div class="card-body">
            <div class="who">
              <div class="avatar lg">{{ initiales }}</div>
              <div>
                <div class="strong">{{ auth.currentUser?.nom }}</div>
                <div class="muted small">{{ auth.currentUser?.email }}</div>
              </div>
            </div>
            <dl class="kv">
              <dt>Rôle</dt><dd><app-statut-badge [statut]="auth.currentUser?.role ?? ''"></app-statut-badge></dd>
              <dt>Statut</dt><dd><span class="badge badge-green">Compte actif</span></dd>
            </dl>
          </div>
        </div>

        <form class="card" [formGroup]="form" (ngSubmit)="changer()">
          <div class="card-head">
            <div>
              <div class="card-title">Changer le mot de passe</div>
              <div class="card-sub">8 caractères minimum</div>
            </div>
          </div>
          <div class="card-body stack">
            <div class="field">
              <label for="ancien">Mot de passe actuel</label>
              <input id="ancien" class="input" type="password" formControlName="ancien" autocomplete="current-password">
            </div>
            <div class="field">
              <label for="nouveau">Nouveau mot de passe</label>
              <input id="nouveau" class="input" type="password" formControlName="nouveau" autocomplete="new-password">
              <span class="field-error" *ngIf="form.controls['nouveau'].touched && form.controls['nouveau'].invalid">8 caractères minimum</span>
            </div>
            <div class="field">
              <label for="confirmation">Confirmer le nouveau mot de passe</label>
              <input id="confirmation" class="input" type="password" formControlName="confirmation" autocomplete="new-password">
              <span class="field-error" *ngIf="form.touched && differents">Les deux mots de passe ne correspondent pas</span>
            </div>
            <div class="alert alert-error" *ngIf="erreur"><lucide-icon name="circle-alert" [size]="18"></lucide-icon>{{ erreur }}</div>
          </div>
          <div class="card-foot">
            <button class="btn btn-primary" type="submit" [disabled]="form.invalid || differents || envoi">
              <lucide-icon name="key-round" [size]="16"></lucide-icon> Mettre à jour
            </button>
          </div>
        </form>
      </div>
    </app-layout>
  `,
  styles: [`
    .top { align-items: start; }
    .who { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
  `],
})
export class ProfilComponent {
  form: FormGroup;
  envoi = false;
  erreur = '';

  constructor(fb: FormBuilder, private http: HttpClient, public auth: AuthService, private toast: ToastService) {
    this.form = fb.group({
      ancien: ['', Validators.required],
      nouveau: ['', [Validators.required, Validators.minLength(8)]],
      confirmation: ['', Validators.required],
    });
  }

  get differents(): boolean {
    const v = this.form.value;
    return !!v.confirmation && v.nouveau !== v.confirmation;
  }

  get initiales(): string {
    return (this.auth.currentUser?.nom ?? 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  changer(): void {
    this.envoi = true;
    this.erreur = '';
    const v = this.form.value;
    this.http.put(`${environment.apiUrl}/utilisateurs/me/mot-de-passe`,
      { ancienMotDePasse: v.ancien, nouveauMotDePasse: v.nouveau }).subscribe({
      next: () => { this.envoi = false; this.form.reset(); this.toast.success('Mot de passe mis à jour'); },
      error: (e: Error) => { this.envoi = false; this.erreur = e.message; },
    });
  }
}
