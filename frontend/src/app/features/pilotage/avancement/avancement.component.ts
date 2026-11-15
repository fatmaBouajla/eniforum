import { Component } from '@angular/core';

/** Avancement détaillé de chaque comité, les plus en difficulté en premier. */
@Component({
  selector: 'app-avancement',
  template: `
    <app-layout title="Avancement" subtitle="État détaillé de chaque comité, les plus en difficulté en premier">
      <app-bilan-comites></app-bilan-comites>
    </app-layout>
  `,
})
export class AvancementComponent {}
