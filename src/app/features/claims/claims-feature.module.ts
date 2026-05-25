import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { ClaimsFeatureRoutingModule } from './claims-feature-routing.module';
import { WorkspaceLayoutModule } from '../../shared/layout/workspace/workspace-layout.module';
import { OperationalUxModule } from '../../shared/operational/operational-ux.module';
import { ClaimsWorkspacePageComponent } from './workspace/claims-workspace-page.component';
import { ClaimsOperationsPageComponent } from './operations/claims-operations-page.component';
import { ClaimWorkspaceHeaderComponent } from './workspace/components/claim-workspace-header.component';
import { ClaimLifecyclePanelComponent } from './workspace/components/claim-lifecycle-panel.component';
import { ClaimFinancialSummaryComponent } from './workspace/components/claim-financial-summary.component';
import { ClaimServiceLinesGridComponent } from './workspace/components/claim-service-lines-grid.component';
import { ClaimAdjustmentsPanelComponent } from './workspace/components/claim-adjustments-panel.component';
import { ClaimPaymentsPanelComponent } from './workspace/components/claim-payments-panel.component';
import { ClaimEraPanelComponent } from './workspace/components/claim-era-panel.component';
import { ClaimTimelinePanelComponent } from './workspace/components/claim-timeline-panel.component';
import { ClaimWorkflowSidebarComponent } from './workspace/components/claim-workflow-sidebar.component';

@NgModule({
  declarations: [
    ClaimsWorkspacePageComponent,
    ClaimsOperationsPageComponent,
    ClaimWorkspaceHeaderComponent,
    ClaimLifecyclePanelComponent,
    ClaimFinancialSummaryComponent,
    ClaimServiceLinesGridComponent,
    ClaimAdjustmentsPanelComponent,
    ClaimPaymentsPanelComponent,
    ClaimEraPanelComponent,
    ClaimTimelinePanelComponent,
    ClaimWorkflowSidebarComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    WorkspaceLayoutModule,
    OperationalUxModule,
    ClaimsFeatureRoutingModule
  ]
})
export class ClaimsFeatureModule {}
