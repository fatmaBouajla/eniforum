import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Role, User } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

/** Gestion des comptes : création, modification, rôle, activation, suppression. */
@Component({
  selector: 'app-utilisateurs',
  templateUrl: './utilisateurs.component.html',
})
export class UtilisateursComponent implements OnInit {
  users: User[] = [];
  loading = true;
  erreur = '';
  recherche = '';
  filtreRole = '';

  modalOuvert = false;
  edition: User | null = null;
  enregistrement = false;
  erreurForm = '';
  aSupprimer: User | null = null;
  form: FormGroup;

  readonly roles: { value: Role; label: string }[] = [
    { value: 'ADMIN', label: 'Administrateur' },
    { value: 'COMITE_PILOTAGE', label: 'Comité de pilotage' },
    { value: 'COORDINATRICE', label: 'Coordinatrice' },
    { value: 'CHEF_COMITE', label: 'Chef de comité' },
    { value: 'MEMBRE', label: 'Membre' },
  ];
  private api = `${environment.apiUrl}/utilisateurs`;

  get monEmail(): string { return this.auth.currentUser?.email ?? ''; }

  constructor(private fb: FormBuilder, private http: HttpClient, private toast: ToastService, private auth: AuthService) {
    this.form = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      motDePasse: [''],
      role: ['MEMBRE', Validators.required],
    });
  }

  ngOnInit(): void { this.charger(); }

  charger(): void {
    this.http.get<User[]>(this.api).subscribe({
      next: u => { this.users = u.sort((a, b) => a.nom.localeCompare(b.nom)); this.loading = false; },
      error: (e: Error) => { this.erreur = e.message; this.loading = false; },
    });
  }

  get filtres(): User[] {
    const q = this.recherche.trim().toLowerCase();
    return this.users.filter(u =>
      (!q || u.nom.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
      (!this.filtreRole || u.role === this.filtreRole));
  }

  nombre(role: string): number { return role ? this.users.filter(u => u.role === role).length : this.users.length; }

  ouvrir(u: User | null): void {
    this.edition = u;
    this.erreurForm = '';
    const mdp = this.form.controls['motDePasse'];
    if (u) {
      this.form.reset({ nom: u.nom, email: u.email, role: u.role, motDePasse: '' });
      mdp.setValidators([Validators.minLength(8)]);   // facultatif en modification
    } else {
      this.form.reset({ role: 'MEMBRE', motDePasse: '' });
      mdp.setValidators([Validators.required, Validators.minLength(8)]);
    }
    mdp.updateValueAndValidity();
    this.modalOuvert = true;
  }

  enregistrer(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.enregistrement = true;
    const v = this.form.value;
    let requete: Observable<unknown>;
    if (this.edition) {
      const corps: Record<string, unknown> = { nom: v.nom, email: v.email };
      if (v.motDePasse) corps['motDePasse'] = v.motDePasse;
      const appels: Observable<unknown>[] = [this.http.put(`${this.api}/${this.edition.id}`, corps)];
      // Le rôle se change par un appel dédié
      if (v.role !== this.edition.role) appels.push(this.http.patch(`${this.api}/${this.edition.id}/role?role=${v.role}`, {}));
      requete = forkJoin(appels);
    } else {
      requete = this.http.post(this.api, { nom: v.nom, email: v.email, motDePasse: v.motDePasse, role: v.role, actif: true });
    }
    requete.subscribe({
      next: () => {
        this.enregistrement = false;
        this.modalOuvert = false;
        this.toast.success(this.edition ? 'Utilisateur modifié' : 'Utilisateur créé');
        this.charger();
      },
      error: (e: Error) => { this.enregistrement = false; this.erreurForm = e.message; },
    });
  }

  basculerActif(u: User): void {
    this.http.patch<User>(`${this.api}/${u.id}/activer?actif=${!u.actif}`, {}).subscribe({
      next: () => { u.actif = !u.actif; this.toast.success(u.actif ? 'Compte réactivé' : 'Compte désactivé'); },
      error: (e: Error) => this.toast.error(e.message),
    });
  }

  supprimer(): void {
    const u = this.aSupprimer;
    if (!u) return;
    this.aSupprimer = null;
    this.http.delete(`${this.api}/${u.id}`).subscribe({
      next: () => { this.toast.success('Utilisateur supprimé'); this.charger(); },
      error: (e: Error) => this.toast.error(e.message + '. Vous pouvez plutôt désactiver le compte.'),
    });
  }

  initiales(nom: string): string { return nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2); }
  get f() { return this.form.controls; }
}
