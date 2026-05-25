import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PatientsFeatureRoutingModule } from './patients-feature-routing.module';
import { WorkspaceLayoutModule } from '../../shared/layout/workspace/workspace-layout.module';
import { OperationalUxModule } from '../../shared/operational/operational-ux.module';
import { PatientWorkspacePageComponent } from './workspace/patient-workspace-page.component';
import { PatientWorkspaceHeaderComponent } from './workspace/components/patient-workspace-header.component';
import { PatientContextualActionsComponent } from './workspace/components/patient-contextual-actions.component';
import { WorkspaceSliceStatusComponent } from './workspace/components/workspace-slice-status.component';
import { WorkspaceWidgetSkeletonComponent } from './workspace/components/workspace-widget-skeleton.component';
import { PatientOverviewTabComponent } from './workspace/tabs/patient-overview-tab.component';
import { PatientClaimsTabComponent } from './workspace/tabs/patient-claims-tab.component';
import { PatientPaymentsTabComponent } from './workspace/tabs/patient-payments-tab.component';
import { PatientLookupPageComponent } from './lookup/patient-lookup-page.component';

@NgModule({
  declarations: [
    PatientWorkspacePageComponent,
    PatientWorkspaceHeaderComponent,
    PatientContextualActionsComponent,
    WorkspaceSliceStatusComponent,
    WorkspaceWidgetSkeletonComponent,
    PatientOverviewTabComponent,
    PatientClaimsTabComponent,
    PatientPaymentsTabComponent,
    PatientLookupPageComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    WorkspaceLayoutModule,
    OperationalUxModule,
    PatientsFeatureRoutingModule
  ]
})
export class PatientsFeatureModule {}
