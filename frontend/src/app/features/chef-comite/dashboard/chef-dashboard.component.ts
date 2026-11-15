import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CandidatureCVService, ComiteService, TacheService, WorkshopService } from '../../../core/services/api.services';
import { AuthService } from '../../../core/services/auth.service';
import { Comite, Tache, Workshop } from '../../../core/models';
import { iconeComite } from '../../../shared/icons';

/** Tableau de bord du chef de comité. */
@Component({
  selector: 'app-chef-dashboard',
  templateUrl: './chef-dashboard.component.html',
  styleUrls: ['./chef-dashboard.component.scss'],
})
export class ChefDashboardComponent implements OnInit {
  comite: Comite | null = null;
  taches: Tache[] = [];
  workshops: Workshop[] = [];
  demandes = 0;
  loading = true;
  sansComite = false;

  constructor(
    private comites: ComiteService, private tachesSrv: TacheService, private ws: WorkshopService,
    private cvs: CandidatureCVService, public auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.comites.getMonComite().subscribe({
      next: c => {
        this.comite = c;
        forkJoin({
          taches: this.tachesSrv.getAll().pipe(catchError(() => of([] as Tache[]))),
          ws: this.ws.getAll().pipe(catchError(() => of([] as Workshop[]))),
          cvs: this.cvs.getAll().pipe(catchError(() => of([]))),
        }).subscribe(r => {
          this.taches = r.taches;
          this.workshops = r.ws.filter(w => new Date(w.dateHeure) >= new Date()).slice(0, 3);
          this.demandes = r.cvs.filter(c => c.statut === 'EN_ATTENTE').length;
          this.loading = false;
        });
      },
      error: () => { this.sansComite = true; this.loading = false; },
    });
  }

  nb(s: string): number { return this.taches.filter(t => t.statut === s).length; }
  get avancement(): number { return this.taches.length ? Math.round(this.nb('TERMINEE') / this.taches.length * 100) : 0; }
  get aSuivre(): Tache[] {
    return this.taches.filter(t => t.statut !== 'TERMINEE').sort((a, b) => a.dateFin.localeCompare(b.dateFin)).slice(0, 5);
  }
  get prenom(): string { return this.auth.currentUser?.nom?.split(' ')[0] ?? ''; }
  icone(n: string): string { return iconeComite(n); }
}
