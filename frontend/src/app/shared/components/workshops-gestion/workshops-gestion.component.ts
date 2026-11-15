import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Comite, StatutWorkshop, Workshop } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Workshops et conférences, partagés par la coordinatrice (validation de toutes
 * les propositions) et le chef de comité (propositions de son comité).
 */
@Component({
  selector: 'app-workshops-gestion',
  templateUrl: './workshops-gestion.component.html',
  styleUrls: ['./workshops-gestion.component.scss'],
})
export class WorkshopsGestionComponent implements OnInit {
  @Input() mode: 'coordination' | 'chef' = 'coordination';

  workshops: Workshop[] = [];
  comites: Comite[] = [];
  loading = true;
  erreur = '';
  filtre: StatutWorkshop | '' = '';
  modalOuvert = false;
  edition: Workshop | null = null;
  enregistrement = false;
  erreurForm = '';
  aRefuser: Workshop | null = null;
  aSupprimer: Workshop | null = null;
  motif = '';
  form: FormGroup;

  readonly filtres: { cle: StatutWorkshop | ''; libelle: string }[] = [
    { cle: '', libelle: 'Tous' }, { cle: 'PROPOSE', libelle: 'À valider' },
    { cle: 'VALIDE', libelle: 'Validés' }, { cle: 'REFUSE', libelle: 'Refusés' },
  ];
  private api = environment.apiUrl;

  constructor(private fb: FormBuilder, private http: HttpClient, private toast: ToastService) {
    this.form = this.fb.group({
      titre: ['', Validators.required],
      description: ['', Validators.required],
      intervenant: ['', Validators.required],
      dateHeure: ['', Validators.required],
      comiteId: [null, Validators.required],
    });
  }

  get estChef(): boolean { return this.mode === 'chef'; }

  ngOnInit(): void {
    if (!this.estChef) this.filtre = 'PROPOSE';
    this.charger();
  }

  charger(): void {
    const comites$: Observable<Comite[]> = this.estChef
      ? this.http.get<Comite>(`${this.api}/comites/mon-comite`).pipe(map(c => [c]))
      : this.http.get<Comite[]>(`${this.api}/comites`);
    forkJoin({ comites: comites$, ws: this.http.get<Workshop[]>(`${this.api}/workshops`) }).subscribe({
      next: r => {
        this.comites = r.comites;
        this.workshops = r.ws.sort((a, b) => (a.dateHeure ?? '').localeCompare(b.dateHeure ?? ''));
        this.loading = false;
      },
      error: (e: Error) => {
        this.erreur = this.estChef ? 'Vous n’êtes chef d’aucun comité pour le moment.' : e.message;
        this.loading = false;
      },
    });
  }

  get visibles(): Workshop[] { return this.workshops.filter(w => !this.filtre || w.statut === this.filtre); }
  nombre(s: StatutWorkshop | ''): number { return s ? this.workshops.filter(w => w.statut === s).length : this.workshops.length; }

  // Le chef ne modifie que les propositions non traitées
  modifiable(w: Workshop): boolean { return !this.estChef || w.statut === 'PROPOSE'; }

  ouvrir(w: Workshop | null): void {
    this.edition = w;
    this.erreurForm = '';
    this.form.reset(w ? {
      titre: w.titre, description: w.description, intervenant: w.intervenant,
      dateHeure: w.dateHeure?.slice(0, 16), comiteId: w.comite?.id ?? null,
    } : { comiteId: this.comites.length === 1 ? this.comites[0].id : null });
    if (w) this.form.controls['comiteId'].disable(); else this.form.controls['comiteId'].enable();
    this.modalOuvert = true;
  }

  enregistrer(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.enregistrement = true;
    const v = this.form.getRawValue();
    const corps = { titre: v.titre, description: v.description, intervenant: v.intervenant,
      dateHeure: v.dateHeure.length === 16 ? v.dateHeure + ':00' : v.dateHeure, comite: { id: +v.comiteId } };
    const req = this.edition ? this.http.put(`${this.api}/workshops/${this.edition.id}`, corps) : this.http.post(`${this.api}/workshops`, corps);
    req.subscribe({
      next: () => {
        this.enregistrement = false; this.modalOuvert = false;
        this.toast.success(this.edition ? 'Workshop modifié' : (this.estChef ? 'Proposition envoyée à la coordinatrice' : 'Workshop ajouté'));
        this.charger();
      },
      error: (e: Error) => { this.enregistrement = false; this.erreurForm = e.message; },
    });
  }

  valider(w: Workshop): void {
    this.http.put(`${this.api}/workshops/${w.id}/valider`, {}).subscribe({
      next: () => { this.toast.success(`« ${w.titre} » validé`); this.charger(); },
      error: (e: Error) => this.toast.error(e.message),
    });
  }

  refuser(): void {
    const w = this.aRefuser;
    if (!w || !this.motif.trim()) return;
    this.http.put(`${this.api}/workshops/${w.id}/refuser`, null, { params: { commentaire: this.motif.trim() } }).subscribe({
      next: () => { this.aRefuser = null; this.motif = ''; this.toast.success('Workshop refusé'); this.charger(); },
      error: (e: Error) => this.toast.error(e.message),
    });
  }

  supprimer(): void {
    const w = this.aSupprimer;
    this.aSupprimer = null;
    if (!w) return;
    this.http.delete(`${this.api}/workshops/${w.id}`).subscribe({
      next: () => { this.toast.success('Workshop supprimé'); this.charger(); },
      error: (e: Error) => this.toast.error(e.message),
    });
  }

  get f() { return this.form.controls; }
}
