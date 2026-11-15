import { Component } from '@angular/core';

/** Vue consolidée des comités : avancement, retards et équipes. */
@Component({
  selector: 'app-coord-comites',
  template: `
    <app-layout title="Comités" subtitle="Avancement, retards et équipe de chaque comité">
      <app-bilan-comites [avecMembres]="true"></app-bilan-comites>
    </app-layout>
  `,
})
export class CoordComitesComponent {}
