import { Component, Input, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Comite, StatutTache, Tache, User } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';
import { joursAvant } from '../../../core/utils/graphiques';

function datesCoherentes(g: AbstractControl): ValidationErrors | null {
  const d = g.get('dateDebut')?.value, f = g.get('dateFin')?.value;
  return d && f && f < d ? { dates: true } : null;
}

/**
 * Gestion des tâches, partagée par la coordinatrice (tous les comités)
 * et le chef de comité (son comité uniquement).
 */
@Component({
  selector: 'app-taches-gestion',
  templateUrl: './taches-gestion.component.html',
  styleUrls: ['./taches-gestion.component.scss'],
})
export class TachesGestionComponent implements OnInit {
  @Input() mode: 'coordination' | 'chef' = 'coordination';

  taches: Tache[] = [];
  comites: Comite[] = [];
  loading = true;
  erreur = '';
  filtreStatut: StatutTache | '' = '';
  filtreComite: number | '' = '';
  recherche = '';

  modalOuvert = false;
  edition: Tache | null = null;
  enregistrement = false;
  erreurForm = '';
  commentaires: Tache | null = null;
  form: FormGroup;

  readonly statuts: { cle: StatutTache | ''; libelle: string }[] = [
    { cle: '', libelle: 'Toutes' }, { cle: 'A_FAIRE', libelle: 'À faire' }, { cle: 'EN_COURS', libelle: 'En cours' },
    { cle: 'EN_RETARD', libelle: 'En retard' }, { cle: 'TERMINEE', libelle: 'Terminées' },
  ];
  private api = environment.apiUrl;

  constructor(private fb: FormBuilder, private http: HttpClient, private toast: ToastService) {
    this.form = this.fb.group({
      titre: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      comiteId: [null, Validators.required],
      membreId: [null],
      dateDebut: ['', Validators.required],
      dateFin: ['', Validators.required],
      priorite: ['NORMALE'],
    }, { validators: datesCoherentes });
  }

  get estChef(): boolean { return this.mode === 'chef'; }

  ngOnInit(): void { this.charger(); }

  charger(): void {
    // Le chef ne voit que son comité ; la coordinatrice voit tous les comités
    const comites$: Observable<Comite[]> = this.estChef
      ? this.http.get<Comite>(`${this.api}/comites/mon-comite`).pipe(map(c => [c]))
      : this.http.get<Comite[]>(`${this.api}/comites`);
    forkJoin({ comites: comites$, taches: this.http.get<Tache[]>(`${this.api}/taches`) }).subscribe({
      next: r => {
        this.comites = r.comites;
        this.taches = r.taches.sort((a, b) => this.ordre(a) - this.ordre(b) || a.dateFin.localeCompare(b.dateFin));
        this.loading = false;
      },
      error: (e: Error) => {
        this.erreur = this.estChef ? 'Vous n’êtes chef d’aucun comité pour le moment.' : e.message;
        this.loading = false;
      },
    });
  }

  // Les retards et les urgences en premier, les tâches terminées en dernier
  private ordre(t: Tache): number {
    return t.statut === 'EN_RETARD' ? 0 : t.statut === 'TERMINEE' ? 3 : t.priorite === 'URGENTE' ? 1 : 2;
  }

  get visibles(): Tache[] {
    const q = this.recherche.trim().toLowerCase();
    return this.taches.filter(t =>
      (!this.filtreStatut || t.statut === this.filtreStatut) &&
      (!this.filtreComite || t.comiteId === +this.filtreComite) &&
      (!q || t.titre.toLowerCase().includes(q) || (t.membreNom ?? '').toLowerCase().includes(q)));
  }

  nombre(s: StatutTache | ''): number { return s ? this.taches.filter(t => t.statut === s).length : this.taches.length; }

  // Membres du comité choisi dans le formulaire
  get membresDuComite(): User[] {
    const c = this.comites.find(x => x.id === +this.form.value.comiteId);
    return c?.membres ?? [];
  }

  ouvrir(t: Tache | null): void {
    this.edition = t;
    this.erreurForm = '';
    const aujourdhui = new Date().toISOString().slice(0, 10);
    this.form.reset(t ? {
      titre: t.titre, description: t.description, comiteId: t.comiteId, membreId: t.membreId ?? null,
      dateDebut: t.dateDebut, dateFin: t.dateFin, priorite: t.priorite,
    } : { comiteId: this.comites.length === 1 ? this.comites[0].id : null, membreId: null, dateDebut: aujourdhui, dateFin: '', priorite: 'NORMALE' });
    this.modalOuvert = true;
  }

  changerComite(): void { this.form.patchValue({ membreId: null }); }

  enregistrer(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.enregistrement = true;
    const v = this.form.value;
    const corps = { ...v, comiteId: +v.comiteId, membreId: v.membreId ? +v.membreId : null };
    const req = this.edition ? this.http.put(`${this.api}/taches/${this.edition.id}`, corps) : this.http.post(`${this.api}/taches`, corps);
    req.subscribe({
      next: () => {
        this.enregistrement = false; this.modalOuvert = false;
        this.toast.success(this.edition ? 'Tâche modifiée' : 'Tâche créée');
        this.charger();
      },
      error: (e: Error) => { this.enregistrement = false; this.erreurForm = e.message; },
    });
  }

  basculerUrgence(t: Tache): void {
    const priorite = t.priorite === 'URGENTE' ? 'NORMALE' : 'URGENTE';
    this.http.put(`${this.api}/taches/${t.id}`, { priorite }).subscribe({
      next: () => { t.priorite = priorite; this.toast.success(priorite === 'URGENTE' ? 'Tâche marquée urgente' : 'Priorité normale'); },
      error: (e: Error) => this.toast.error(e.message),
    });
  }

  echeance(t: Tache): { texte: string; classe: string } {
    const j = joursAvant(t.dateFin);
    if (t.statut === 'TERMINEE' || j === null) return { texte: '', classe: '' };
    if (j < 0) return { texte: `${-j} j de retard`, classe: 'red' };
    if (j === 0) return { texte: 'Aujourd’hui', classe: 'amber' };
    return { texte: `Dans ${j} j`, classe: j <= 3 ? 'amber' : '' };
  }

  initiales(n?: string): string { return (n || '?').split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2); }
  get f() { return this.form.controls; }
}
