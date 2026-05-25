import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PatientWorkspacePageComponent } from './workspace/patient-workspace-page.component';
import { PatientOverviewTabComponent } from './workspace/tabs/patient-overview-tab.component';
import { PatientClaimsTabComponent } from './workspace/tabs/patient-claims-tab.component';
import { PatientPaymentsTabComponent } from './workspace/tabs/patient-payments-tab.component';
import { PatientLookupPageComponent } from './lookup/patient-lookup-page.component';

const workspaceChildRoutes: Routes = [
  { path: '', redirectTo: 'overview', pathMatch: 'full' },
  { path: 'overview', component: PatientOverviewTabComponent },
  { path: 'claims', component: PatientClaimsTabComponent },
  { path: 'payments', component: PatientPaymentsTabComponent },
  { path: '**', redirectTo: 'overview' }
];

const routes: Routes = [
  { path: 'lookup', component: PatientLookupPageComponent },
  {
    path: ':patId/workspace',
    component: PatientWorkspacePageComponent,
    children: workspaceChildRoutes
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PatientsFeatureRoutingModule {}
