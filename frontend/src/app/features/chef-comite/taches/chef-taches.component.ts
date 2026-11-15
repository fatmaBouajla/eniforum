import { Component } from '@angular/core';

/** Tâches du comité : création, assignation aux membres et suivi. */
@Component({
  selector: 'app-chef-taches',
  template: `
    <app-layout title="Tâches du comité" subtitle="Créez, assignez et suivez les tâches de votre équipe">
      <app-taches-gestion mode="chef"></app-taches-gestion>
    </app-layout>
  `,
})
export class ChefTachesComponent {}
