import { Component, OnInit } from '@angular/core';
import { TacheService } from '../../../core/services/api.services';
import { StatutTache, Tache } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';
import { joursAvant } from '../../../core/utils/graphiques';

interface Colonne { titre: string; icone: string; statuts: StatutTache[]; }

/** Mes tâches : tableau en colonnes, changement de statut et commentaires. */
@Component({
  selector: 'app-membre-taches',
  templateUrl: './membre-taches.component.html',
  styleUrls: ['./membre-taches.component.scss'],
})
export class MembreTachesComponent implements OnInit {
  taches: Tache[] = [];
  loading = true;
  erreur = '';
  enCours: number | null = null;
  commentaires: Tache | null = null;
  readonly colonnes: Colonne[] = [
    { titre: 'À faire', icone: 'list-todo', statuts: ['A_FAIRE'] },
    { titre: 'En cours', icone: 'refresh-cw', statuts: ['EN_COURS', 'EN_RETARD'] },
    { titre: 'Terminées', icone: 'circle-check', statuts: ['TERMINEE'] },
  ];

  constructor(private tachesSrv: TacheService, private toast: ToastService) {}

  ngOnInit(): void { this.charger(); }

  charger(): void {
    this.tachesSrv.getMesTaches().subscribe({
      next: t => { this.taches = t.sort((a, b) => a.dateFin.localeCompare(b.dateFin)); this.loading = false; },
      error: (e: Error) => { this.erreur = e.message; this.loading = false; },
    });
  }

  de(c: Colonne): Tache[] { return this.taches.filter(t => c.statuts.includes(t.statut)); }

  changer(t: Tache, statut: StatutTache): void {
    this.enCours = t.id;
    this.tachesSrv.changerStatut(t.id, statut).subscribe({
      next: () => {
        this.enCours = null;
        t.statut = statut;
        this.toast.success(statut === 'TERMINEE' ? 'Bravo, tâche terminée !' : statut === 'EN_COURS' ? 'Tâche démarrée' : 'Tâche rouverte');
      },
      error: (e: Error) => { this.enCours = null; this.toast.error(e.message); },
    });
  }

  echeance(t: Tache): { texte: string; classe: string } {
    const j = joursAvant(t.dateFin);
    if (t.statut === 'TERMINEE' || j === null) return { texte: '', classe: '' };
    if (j < 0) return { texte: `${-j} j de retard`, classe: 'red' };
    if (j === 0) return { texte: 'À rendre aujourd’hui', classe: 'amber' };
    return { texte: `Dans ${j} j`, classe: j <= 3 ? 'amber' : '' };
  }
}
