import { Component, Input } from '@angular/core';

/** Badge coloré pour tout statut, priorité ou rôle. */
@Component({
  selector: 'app-statut-badge',
  template: `<span class="badge" [ngClass]="classe">{{ libelle }}</span>`,
})
export class StatutBadgeComponent {
  @Input() statut = '';

  private static readonly INFOS: Record<string, [string, string]> = {
    A_FAIRE: ['À faire', ''], EN_COURS: ['En cours', 'badge-blue'], TERMINEE: ['Terminée', 'badge-green'],
    EN_RETARD: ['En retard', 'badge-red'], URGENTE: ['Urgente', 'badge-amber'], NORMALE: ['Normale', ''],
    PROPOSE: ['Proposé', 'badge-amber'], VALIDE: ['Validé', 'badge-green'], REFUSE: ['Refusé', 'badge-red'],
    EN_ATTENTE: ['En attente', 'badge-blue'], ACCEPTE: ['Accepté', 'badge-green'],
    PLANIFICATION: ['Planification', 'badge-violet'], CLOTURE: ['Clôturé', ''],
    ADMIN: ['Administrateur', 'badge-violet'], COMITE_PILOTAGE: ['Comité de pilotage', 'badge-blue'],
    COORDINATRICE: ['Coordinatrice', 'badge-green'], CHEF_COMITE: ['Chef de comité', 'badge-amber'],
    MEMBRE: ['Membre', ''],
  };

  get libelle(): string { return StatutBadgeComponent.INFOS[this.statut]?.[0] ?? this.statut; }
  get classe(): string { return StatutBadgeComponent.INFOS[this.statut]?.[1] ?? ''; }
}
