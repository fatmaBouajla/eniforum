import { Component } from '@angular/core';

@Component({
  selector: 'app-chef-workshops',
  template: `
    <app-layout title="Workshops" subtitle="Proposez des workshops et suivez leur validation">
      <app-workshops-gestion mode="chef"></app-workshops-gestion>
    </app-layout>
  `,
})
export class ChefWorkshopsComponent {}
