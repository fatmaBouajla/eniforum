import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ForumProject, StatutProjet } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';
import { joursAvant } from '../../../core/utils/graphiques';

// La date de l'événement ne peut pas précéder le début de l'organisation
function datesCoherentes(g: AbstractControl): ValidationErrors | null {
  const d = g.get('dateDebut')?.value, e = g.get('dateEvenement')?.value;
  return d && e && e < d ? { dates: true } : null;
}

/** Éditions du Forum : création, modification, démarrage et clôture. */
@Component({
  selector: 'app-forum-project',
  templateUrl: './forum-project.component.html',
  styleUrls: ['./forum-project.component.scss'],
})
export class ForumProjectComponent implements OnInit {
  editions: ForumProject[] = [];
  loading = true;
  erreur = '';
  modalOuvert = false;
  edition: ForumProject | null = null;
  enregistrement = false;
  erreurForm = '';
  aCloturer: ForumProject | null = null;
  form: FormGroup;
  private api = `${environment.apiUrl}/forum-projects`;

  constructor(private fb: FormBuilder, private http: HttpClient, private toast: ToastService) {
    this.form = this.fb.group({
      nom: ['', Validators.required],
      edition: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
      dateDebut: ['', Validators.required],
      dateEvenement: ['', Validators.required],
      lieu: ['', Validators.required],
      description: [''],
      statut: ['PLANIFICATION'],
    }, { validators: datesCoherentes });
  }

  ngOnInit(): void { this.charger(); }

  charger(): void {
    this.http.get<ForumProject[]>(this.api).subscribe({
      next: e => { this.editions = e.sort((a, b) => b.edition.localeCompare(a.edition)); this.loading = false; },
      error: (e: Error) => { this.erreur = e.message; this.loading = false; },
    });
  }

  get actives(): ForumProject[] { return this.editions.filter(e => e.statut !== 'CLOTURE'); }
  get cloturees(): ForumProject[] { return this.editions.filter(e => e.statut === 'CLOTURE'); }

  ouvrir(e: ForumProject | null): void {
    this.edition = e;
    this.erreurForm = '';
    const annee = new Date().getFullYear() + 1;
    this.form.reset(e ? { ...e } : {
      nom: `Forum d'Entreprise ENICarthage ${annee}`, edition: String(annee),
      lieu: 'ENICarthage', statut: 'PLANIFICATION', dateDebut: '', dateEvenement: '', description: '',
    });
    this.modalOuvert = true;
  }

  enregistrer(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.enregistrement = true;
    const req = this.edition
      ? this.http.put(`${this.api}/${this.edition.id}`, this.form.value)
      : this.http.post(this.api, this.form.value);
    req.subscribe({
      next: () => {
        this.enregistrement = false; this.modalOuvert = false;
        this.toast.success(this.edition ? 'Édition modifiée' : 'Édition créée');
        this.charger();
      },
      error: (e: Error) => { this.enregistrement = false; this.erreurForm = e.message; },
    });
  }

  changerStatut(e: ForumProject, statut: StatutProjet): void {
    this.http.put(`${this.api}/${e.id}`, { ...e, statut }).subscribe({
      next: () => { this.toast.success('Édition lancée'); this.charger(); },
      error: (err: Error) => this.toast.error(err.message),
    });
  }

  cloturer(): void {
    const e = this.aCloturer;
    this.aCloturer = null;
    if (!e) return;
    this.http.patch(`${this.api}/${e.id}/archiver`, {}).subscribe({
      next: () => { this.toast.success('Édition clôturée et archivée'); this.charger(); },
      error: (err: Error) => this.toast.error(err.message),
    });
  }

  jours(e: ForumProject): number | null { return joursAvant(e.dateEvenement); }
  get f() { return this.form.controls; }
}
