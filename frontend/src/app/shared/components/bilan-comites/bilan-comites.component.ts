import { Component, Input, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ComiteService, TacheService } from '../../../core/services/api.services';
import { Comite, StatutTache, Tache } from '../../../core/models';
import { iconeComite } from '../../../shared/icons';

interface Bilan {
  comite: Comite; taches: Tache[]; parStatut: Record<StatutTache, number>;
  pourcent: number; retards: Tache[]; prochaines: Tache[];
}

/** Bilan de chaque comité : statuts des tâches, retards, prochaines échéances et équipe. */
@Component({
  selector: 'app-bilan-comites',
  templateUrl: './bilan-comites.component.html',
  styleUrls: ['./bilan-comites.component.scss'],
})
export class BilanComitesComponent implements OnInit {
  /** Afficher la liste des membres de chaque comité. */
  @Input() avecMembres = false;
  bilans: Bilan[] = [];
  loading = true;
  erreur = '';
  readonly statuts: { cle: StatutTache; libelle: string; classe: string }[] = [
    { cle: 'A_FAIRE', libelle: 'À faire', classe: 'gris' },
    { cle: 'EN_COURS', libelle: 'En cours', classe: 'bleu' },
    { cle: 'TERMINEE', libelle: 'Terminées', classe: 'vert' },
    { cle: 'EN_RETARD', libelle: 'En retard', classe: 'rouge' },
  ];

  constructor(private comites: ComiteService, private taches: TacheService) {}

  ngOnInit(): void {
    forkJoin({ comites: this.comites.getAll(), taches: this.taches.getAll() }).subscribe({
      next: ({ comites, taches }) => {
        const aujourdhui = new Date().toISOString().slice(0, 10);
        this.bilans = comites.map(c => {
          const t = taches.filter(x => x.comiteId === c.id);
          const parStatut = { A_FAIRE: 0, EN_COURS: 0, TERMINEE: 0, EN_RETARD: 0 } as Record<StatutTache, number>;
          t.forEach(x => parStatut[x.statut]++);
          return {
            comite: c, taches: t, parStatut,
            pourcent: t.length ? Math.round(parStatut.TERMINEE / t.length * 100) : 0,
            retards: t.filter(x => x.statut === 'EN_RETARD'),
            prochaines: t.filter(x => x.statut !== 'TERMINEE' && x.statut !== 'EN_RETARD' && x.dateFin >= aujourdhui)
              .sort((a, b) => a.dateFin.localeCompare(b.dateFin)).slice(0, 2),
          };
        }).sort((a, b) => b.retards.length - a.retards.length || a.pourcent - b.pourcent);
        this.loading = false;
      },
      error: (e: Error) => { this.erreur = e.message; this.loading = false; },
    });
  }

  largeur(b: Bilan, s: StatutTache): number { return b.taches.length ? b.parStatut[s] / b.taches.length * 100 : 0; }
  icone(n: string): string { return iconeComite(n); }
}
