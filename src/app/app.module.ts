import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { RouteReuseStrategy } from '@angular/router';

import { AppRoutingModule } from './app-routing.module';
import { AppShellComponent } from './app-shell/app-shell.component';
import { RibbonComponent } from './ribbon/ribbon.component';
import { SidebarFloatingPanelComponent } from './ribbon/sidebar-floating-panel.component';
import { ClaimListComponent } from './claims/claim-list/claim-list.component';
import { ClaimDetailsComponent } from './claims/claim-details/claim-details.component';
import { HomeComponent } from './home/home.component';
import { PatientListComponent } from './patients/patient-list/patient-list.component';
import { PatientListLegacyComponent } from './patients/patient-list-legacy/patient-list-legacy.component';
import { PatientDetailsComponent } from './patients/patient-details/patient-details.component';
import { ServiceListComponent } from './services/service-list/service-list.component';
import { PaymentListComponent } from './payments/payment-list/payment-list.component';
import { PaymentEntryComponent } from './payments/payment-entry/payment-entry.component';
import { PaymentsLedgerComponent } from './payments/payments-ledger/payments-ledger.component';
import { AdjustmentListComponent } from './adjustments/adjustment-list/adjustment-list.component';
import { PayerListComponent } from './payers/payer-list/payer-list.component';
import { PhysicianListComponent } from './physicians/physician-list/physician-list.component';
import { PhysicianLibraryComponent } from './physicians/physician-library/physician-library.component';
import { DisbursementListComponent } from './disbursements/disbursement-list/disbursement-list.component';
import { ClaimNoteListComponent } from './claim-notes/claim-note-list/claim-note-list.component';
import { LoginComponent } from './login/login.component';
import { UserManagementComponent } from './admin/user-management/user-management.component';
import { FacilityManagementComponent } from './admin/facility-management/facility-management.component';
import { ApiAccessComponent } from './admin/api-access/api-access.component';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { FacilityHeaderInterceptor } from './core/interceptors/facility-header.interceptor';
import { InterfaceDataReviewComponent } from './hl7/interface-data-review/interface-data-review.component';
import { EdiReportsComponent } from './edi-reports/edi-reports.component';
import { EdiEraReviewComponent } from './edi-reports/edi-era-review.component';
import { EraExceptionsComponent } from './features/era-exceptions/era-exceptions.component';
import { AgGridModule } from 'ag-grid-angular';
import { ProcedureCodesPageComponent } from './procedure-codes/procedure-codes-page.component';
import { ColumnChooserDialogComponent } from './procedure-codes/column-chooser-dialog.component';
import { AddColumnHeaderComponent } from './procedure-codes/add-column-header.component';
import { PatientEligibilityComponent } from './patients/patient-eligibility/patient-eligibility.component';
import { ClaimRejectionsComponent } from './features/claim-rejections/claim-rejections.component';
import { SuperAdminComponent } from './super-admin/super-admin.component';
import { UnauthorizedComponent } from './unauthorized/unauthorized.component';
import { EligibilityUiModule } from './patients/eligibility-ui/eligibility-ui.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { WorkspaceRouteReuseStrategy } from './workspace/infrastructure/workspace-route-reuse-strategy';
import { SendClaimsComponent } from './claims/send-claims/send-claims.component';
import { ClaimAddColumnDialogComponent } from './claims/shared/claim-add-column-dialog.component';
import { SharedUiModule } from './shared/ui/shared-ui.module';
import { LayoutModule } from './shared/layout/layout.module';
import { WorkspaceLayoutModule } from './shared/layout/workspace/workspace-layout.module';
import { OperationalUxModule } from './shared/operational/operational-ux.module';
import { PatientWorkspacePreviewComponent } from './patients/patient-workspace-preview/patient-workspace-preview.component';
import { PayerLibraryModule } from './features/payer-library/payer-library.module';

@NgModule({
  declarations: [
    AppShellComponent,
    RibbonComponent,
    SidebarFloatingPanelComponent,
    ClaimListComponent,
    SendClaimsComponent,
    ClaimAddColumnDialogComponent,
    ClaimDetailsComponent,
    HomeComponent,
    PatientListComponent,
    PatientListLegacyComponent,
    PatientDetailsComponent,
    PatientWorkspacePreviewComponent,
    ServiceListComponent,
    PaymentListComponent,
    PaymentEntryComponent,
    PaymentsLedgerComponent,
    AdjustmentListComponent,
    PayerListComponent,
    PhysicianListComponent,
    PhysicianLibraryComponent,
    DisbursementListComponent,
    ClaimNoteListComponent,
    LoginComponent,
    UserManagementComponent,
    FacilityManagementComponent,
    ApiAccessComponent,
    InterfaceDataReviewComponent,
    EdiReportsComponent,
    EdiEraReviewComponent,
    EraExceptionsComponent,
    ProcedureCodesPageComponent,
    ColumnChooserDialogComponent,
    AddColumnHeaderComponent,
    PatientEligibilityComponent,
    ClaimRejectionsComponent,
    SuperAdminComponent,
    UnauthorizedComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    AgGridModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    WorkspaceModule,
    SharedUiModule,
    LayoutModule,
    WorkspaceLayoutModule,
    OperationalUxModule,
    PayerLibraryModule,
    EligibilityUiModule,
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: FacilityHeaderInterceptor, multi: true },
    { provide: RouteReuseStrategy, useClass: WorkspaceRouteReuseStrategy }
  ],
  bootstrap: [AppShellComponent] // Bootstrap with AppShellComponent
})
export class AppModule { }

