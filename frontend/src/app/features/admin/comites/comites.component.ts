import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AvancementComite, Comite, ForumProject, User } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';
import { iconeComite } from '../../../shared/icons';

/** Gestion des comités : création, modification (chef, édition) et suppression. */
@Component({
  selector: 'app-comites',
  templateUrl: './comites.component.html',
  styleUrls: ['./comites.component.scss'],
})
export class ComitesComponent implements OnInit {
  comites: Comite[] = [];
  avancement = new Map<string, AvancementComite>();
  chefs: User[] = [];
  editions: ForumProject[] = [];
  loading = true;
  erreur = '';

  modalOuvert = false;
  edition: Comite | null = null;
  enregistrement = false;
  erreurForm = '';
  aSupprimer: Comite | null = null;
  form: FormGroup;

  private api = environment.apiUrl;

  constructor(private fb: FormBuilder, private http: HttpClient, private toast: ToastService) {
    this.form = this.fb.group({
      nom: ['', Validators.required],
      description: ['', Validators.required],
      forumProjectId: [null, Validators.required],
      chefId: [null],
    });
  }

  ngOnInit(): void { this.charger(); }

  charger(): void {
    forkJoin({
      comites: this.http.get<Comite[]>(`${this.api}/comites`),
      av: this.http.get<AvancementComite[]>(`${this.api}/stats/comites`),
      users: this.http.get<User[]>(`${this.api}/utilisateurs`),
      editions: this.http.get<ForumProject[]>(`${this.api}/forum-projects`),
    }).subscribe({
      next: r => {
        this.comites = r.comites;
        this.avancement = new Map(r.av.map(a => [a.comiteNom, a]));
        this.chefs = r.users.filter(u => u.role === 'CHEF_COMITE');
        this.editions = r.editions;
        this.loading = false;
      },
      error: (e: Error) => { this.erreur = e.message; this.loading = false; },
    });
  }

  ouvrir(c: Comite | null): void {
    this.edition = c;
    this.erreurForm = '';
    const courante = this.editions.find(e => e.statut !== 'CLOTURE')?.id ?? null;
    this.form.reset({
      nom: c?.nom ?? '', description: c?.description ?? '',
      forumProjectId: c?.forumProject?.id ?? courante, chefId: c?.chef?.id ?? null,
    });
    this.modalOuvert = true;
  }

  // Chefs libres + chef actuel du comité édité
  get chefsDisponibles(): User[] {
    const pris = new Set(this.comites.filter(c => c.id !== this.edition?.id && c.chef).map(c => c.chef!.id));
    return this.chefs.filter(u => !pris.has(u.id));
  }

  enregistrer(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.enregistrement = true;
    const v = this.form.value;
    const corps = {
      nom: v.nom, description: v.description,
      forumProject: { id: +v.forumProjectId },
      chef: v.chefId ? { id: +v.chefId } : null,
    };
    const req = this.edition
      ? this.http.put(`${this.api}/comites/${this.edition.id}`, corps)
      : this.http.post(`${this.api}/comites`, corps);
    req.subscribe({
      next: () => {
        this.enregistrement = false; this.modalOuvert = false;
        this.toast.success(this.edition ? 'Comité modifié' : 'Comité créé');
        this.charger();
      },
      error: (e: Error) => { this.enregistrement = false; this.erreurForm = e.message; },
    });
  }

  supprimer(): void {
    const c = this.aSupprimer;
    this.aSupprimer = null;
    if (!c) return;
    this.http.delete(`${this.api}/comites/${c.id}`).subscribe({
      next: () => { this.toast.success('Comité supprimé'); this.charger(); },
      error: (e: Error) => this.toast.error(e.message),
    });
  }

  icone(nom: string): string { return iconeComite(nom); }
  pourcent(c: Comite): number { return this.avancement.get(c.nom)?.avancement ?? 0; }
  taches(c: Comite): number { return this.avancement.get(c.nom)?.total ?? 0; }
  initiales(nom: string): string { return nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2); }
  get f() { return this.form.controls; }
}
