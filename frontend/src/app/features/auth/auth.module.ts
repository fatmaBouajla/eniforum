import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { LoginComponent } from './login/login.component';
import { CandidatureComponent } from './candidature/candidature.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'candidature-chef', component: CandidatureComponent, data: { poste: 'CHEF_COMITE' } },
  { path: 'inscription-membre', component: CandidatureComponent, data: { poste: 'MEMBRE' } },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];

@NgModule({
  declarations: [LoginComponent, CandidatureComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class AuthModule {}
