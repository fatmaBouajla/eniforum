import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  CandidatureCVService, ForumProjectService, StatistiquesService, TacheService, WorkshopService,
} from '../../../core/services/api.services';
import { AvancementComite, CandidatureCV, ForumProject, KPIs, Tache, Workshop } from '../../../core/models';
import { libellePoste, lireAnalyse, lireDossier } from '../../../core/utils/analyse-ia';
import { exporterCsv } from '../../../core/utils/export';

/** Rapport d'avancement imprimable (PDF) et exports Excel (CSV). */
@Component({
  selector: 'app-rapports',
  templateUrl: './rapports.component.html',
  styleUrls: ['./rapports.component.scss'],
})
export class RapportsComponent implements OnInit {
  kpis: KPIs | null = null;
  avancements: AvancementComite[] = [];
  taches: Tache[] = [];
  cvs: CandidatureCV[] = [];
  workshops: Workshop[] = [];
  edition: ForumProject | null = null;
  loading = true;
  erreur = '';
  readonly date = new Date();

  constructor(
    private stats: StatistiquesService, private tacheSrv: TacheService, private cvSrv: CandidatureCVService,
    private wsSrv: WorkshopService, private forumSrv: ForumProjectService,
  ) {}

  ngOnInit(): void {
    forkJoin({
      kpis: this.stats.getKPIs(), av: this.stats.getAvancementComites(), taches: this.tacheSrv.getAll(),
      cvs: this.cvSrv.getAll(), ws: this.wsSrv.getAll(),
      edition: this.forumSrv.getCurrent().pipe(catchError(() => of(null))),
    }).subscribe({
      next: r => {
        Object.assign(this, { kpis: r.kpis, avancements: r.av, taches: r.taches, cvs: r.cvs, workshops: r.ws, edition: r.edition });
        this.loading = false;
      },
      error: (e: Error) => { this.erreur = e.message; this.loading = false; },
    });
  }

  get retards(): Tache[] { return this.taches.filter(t => t.statut === 'EN_RETARD'); }
  nbCv(statut: string): number { return this.cvs.filter(c => c.statut === statut).length; }
  nbWs(statut: string): number { return this.workshops.filter(w => w.statut === statut).length; }

  imprimer(): void { window.print(); }

  exporterTaches(): void {
    exporterCsv('taches', ['Titre', 'Comité', 'Assignée à', 'Début', 'Échéance', 'Priorité', 'Statut'],
      this.taches.map(t => [t.titre, t.comiteNom ?? '', t.membreNom ?? '', t.dateDebut, t.dateFin, t.priorite, t.statut]));
  }

  exporterCandidatures(): void {
    exporterCsv('candidatures', ['Nom', 'Email', 'Poste', 'Comité', 'Déposée le', 'Score IA', 'Recommandation', 'Statut'],
      this.cvs.map(c => {
        const a = lireAnalyse(c);
        return [c.candidatNom, c.candidatEmail ?? '', libellePoste(c.posteVise), lireDossier(c.dossierComplet)['Comité'] ?? '',
          (c.dateDepot ?? '').slice(0, 10), a.score ?? '', a.recommandation ?? '', c.statut];
      }));
  }

  exporterComites(): void {
    exporterCsv('avancement_comites', ['Comité', 'Tâches', 'Terminées', 'Avancement (%)'],
      this.avancements.map(a => [a.comiteNom, a.total, a.terminees, a.avancement]));
  }
}
