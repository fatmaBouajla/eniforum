import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ProfilComponent } from './profil.component';

const routes: Routes = [{ path: '', component: ProfilComponent }];

@NgModule({
  declarations: [ProfilComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class CompteModule {}
