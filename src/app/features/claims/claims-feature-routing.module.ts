import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClaimsOperationsPageComponent } from './operations/claims-operations-page.component';
import { ClaimsWorkspacePageComponent } from './workspace/claims-workspace-page.component';

const routes: Routes = [
  { path: 'operations', component: ClaimsOperationsPageComponent },
  { path: ':claimId/workspace', component: ClaimsWorkspacePageComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ClaimsFeatureRoutingModule {}
