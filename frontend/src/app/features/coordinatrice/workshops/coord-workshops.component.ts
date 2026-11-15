import { Component } from '@angular/core';

@Component({
  selector: 'app-coord-workshops',
  template: `
    <app-layout title="Workshops et conférences" subtitle="Validez les propositions des comités et gérez le programme">
      <app-workshops-gestion mode="coordination"></app-workshops-gestion>
    </app-layout>
  `,
})
export class CoordWorkshopsComponent {}
