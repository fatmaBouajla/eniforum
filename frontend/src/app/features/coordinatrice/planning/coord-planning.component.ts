import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ForumProjectService, WorkshopService } from '../../../core/services/api.services';
import { ForumProject, Workshop } from '../../../core/models';

interface Jour { date: string; items: Workshop[]; }

/** Planning des workshops validés, regroupés par jour. */
@Component({
  selector: 'app-coord-planning',
  templateUrl: './coord-planning.component.html',
  styleUrls: ['./coord-planning.component.scss'],
})
export class CoordPlanningComponent implements OnInit {
  jours: Jour[] = [];
  enAttente = 0;
  edition: ForumProject | null = null;
  passes = false;
  loading = true;
  erreur = '';
  private tous: Workshop[] = [];

  constructor(private ws: WorkshopService, private forums: ForumProjectService) {}

  ngOnInit(): void {
    forkJoin({ ws: this.ws.getAll(), edition: this.forums.getCurrent().pipe(catchError(() => of(null))) }).subscribe({
      next: r => {
        this.edition = r.edition;
        this.tous = r.ws.filter(w => w.statut === 'VALIDE').sort((a, b) => a.dateHeure.localeCompare(b.dateHeure));
        this.enAttente = r.ws.filter(w => w.statut === 'PROPOSE').length;
        this.grouper();
        this.loading = false;
      },
      error: (e: Error) => { this.erreur = e.message; this.loading = false; },
    });
  }

  grouper(): void {
    const aujourdhui = new Date().toISOString().slice(0, 10);
    const map = new Map<string, Workshop[]>();
    this.tous.filter(w => this.passes || w.dateHeure.slice(0, 10) >= aujourdhui).forEach(w => {
      const j = w.dateHeure.slice(0, 10);
      map.set(j, [...(map.get(j) ?? []), w]);
    });
    this.jours = [...map.entries()].map(([date, items]) => ({ date, items }));
  }

  estJourForum(d: string): boolean { return d === this.edition?.dateEvenement; }
}
