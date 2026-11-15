/* src/app/shared/shared.module.ts */
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { SidebarComponent }      from './components/sidebar/sidebar.component';
import { TopbarComponent }       from './components/topbar/topbar.component';
import { LayoutComponent }       from './components/layout/layout.component';
import { StatutBadgeComponent }  from './components/statut-badge/statut-badge.component';
import { StatCardComponent }     from './components/stat-card/stat-card.component';
import { ConfirmModalComponent } from './components/confirm-modal/confirm-modal.component';
import { StatutPipe }            from './pipes/statut.pipe';
import { ScoreRingComponent }    from './components/score-ring/score-ring.component';
import { AnalyseIaComponent }    from './components/analyse-ia/analyse-ia.component';
import { ModalComponent }        from './components/modal/modal.component';
import { EmptyComponent }        from './components/empty/empty.component';
import { ToastsComponent }       from './components/toasts/toasts.component';
import { DecisionComponent }     from './components/decision/decision.component';
import { CommentairesComponent } from './components/commentaires/commentaires.component';
import { TachesGestionComponent } from './components/taches-gestion/taches-gestion.component';
import { BilanComitesComponent } from './components/bilan-comites/bilan-comites.component';
import { WorkshopsGestionComponent } from './components/workshops-gestion/workshops-gestion.component';
import { LucideAngularModule }   from 'lucide-angular';
import { ICONES }                from './icons';

@NgModule({
  declarations: [
    SidebarComponent, TopbarComponent, LayoutComponent,
    StatutBadgeComponent, StatCardComponent, ConfirmModalComponent,
    StatutPipe, ScoreRingComponent, AnalyseIaComponent,
    ModalComponent, EmptyComponent, ToastsComponent, DecisionComponent,
    CommentairesComponent, TachesGestionComponent, BilanComitesComponent, WorkshopsGestionComponent,
  ],
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, LucideAngularModule.pick(ICONES)],
  exports: [
    CommonModule, RouterModule, ReactiveFormsModule, FormsModule, LucideAngularModule,
    SidebarComponent, TopbarComponent, LayoutComponent,
    StatutBadgeComponent, StatCardComponent, ConfirmModalComponent,
    StatutPipe, ScoreRingComponent, AnalyseIaComponent,
    ModalComponent, EmptyComponent, ToastsComponent, DecisionComponent,
    CommentairesComponent, TachesGestionComponent, BilanComitesComponent, WorkshopsGestionComponent,
  ],
})
export class SharedModule {}
