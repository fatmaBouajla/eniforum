import { Component } from '@angular/core';

/** Tâches de tous les comités : supervision, réassignation et priorités. */
@Component({
  selector: 'app-coord-taches',
  template: `
    <app-layout title="Tâches" subtitle="Toutes les tâches des comités : retards et urgences en premier">
      <app-taches-gestion mode="coordination"></app-taches-gestion>
    </app-layout>
  `,
})
export class CoordTachesComponent {}
