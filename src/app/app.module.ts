import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { RouteReuseStrategy } from '@angular/router';

import { AppRoutingModule } from './app-routing.module';
import { AppShellComponent } from './app-shell/app-shell.component';
import { RibbonComponent } from './ribbon/ribbon.component';
import { ClaimListComponent } from './claims/claim-list/claim-list.component';
import { ClaimDetailsComponent } from './claims/claim-details/claim-details.component';
import { HomeComponent } from './home/home.component';
import { PatientListComponent } from './patients/patient-list/patient-list.component';
import { PatientDetailsComponent } from './patients/patient-details/patient-details.component';
import { ServiceListComponent } from './services/service-list/service-list.component';
import { PaymentListComponent } from './payments/payment-list/payment-list.component';
import { PaymentEntryComponent } from './payments/payment-entry/payment-entry.component';
import { AdjustmentListComponent } from './adjustments/adjustment-list/adjustment-list.component';
import { PayerListComponent } from './payers/payer-list/payer-list.component';
import { PhysicianListComponent } from './physicians/physician-list/physician-list.component';
import { PhysicianLibraryComponent } from './physicians/physician-library/physician-library.component';
import { DisbursementListComponent } from './disbursements/disbursement-list/disbursement-list.component';
import { ClaimNoteListComponent } from './claim-notes/claim-note-list/claim-note-list.component';
import { LoginComponent } from './login/login.component';
import { UserManagementComponent } from './admin/user-management/user-management.component';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { InterfaceDataReviewComponent } from './hl7/interface-data-review/interface-data-review.component';
import { EdiReportsComponent } from './edi-reports/edi-reports.component';
import { EraExceptionsComponent } from './features/era-exceptions/era-exceptions.component';
import { AgGridModule } from 'ag-grid-angular';
import { ProcedureCodesPageComponent } from './procedure-codes/procedure-codes-page.component';
import { ColumnChooserDialogComponent } from './procedure-codes/column-chooser-dialog.component';
import { AddColumnHeaderComponent } from './procedure-codes/add-column-header.component';
import { PatientEligibilityComponent } from './patients/patient-eligibility/patient-eligibility.component';
import { ClaimRejectionsComponent } from './features/claim-rejections/claim-rejections.component';
import { EligibilityResponseComponent } from './patients/eligibility-response/eligibility-response.component';
import { WorkspaceModule } from './workspace/workspace.module';
import { WorkspaceRouteReuseStrategy } from './workspace/infrastructure/workspace-route-reuse-strategy';

@NgModule({
  declarations: [
    AppShellComponent,
    RibbonComponent,
    ClaimListComponent,
    ClaimDetailsComponent,
    HomeComponent,
    PatientListComponent,
    PatientDetailsComponent,
    ServiceListComponent,
    PaymentListComponent,
    PaymentEntryComponent,
    AdjustmentListComponent,
    PayerListComponent,
    PhysicianListComponent,
    PhysicianLibraryComponent,
    DisbursementListComponent,
    ClaimNoteListComponent,
    LoginComponent,
    UserManagementComponent,
    InterfaceDataReviewComponent,
    EdiReportsComponent,
    EraExceptionsComponent,
    ProcedureCodesPageComponent,
    ColumnChooserDialogComponent,
    AddColumnHeaderComponent,
    PatientEligibilityComponent,
    EligibilityResponseComponent,
    ClaimRejectionsComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    AgGridModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    WorkspaceModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: RouteReuseStrategy, useClass: WorkspaceRouteReuseStrategy }
  ],
  bootstrap: [AppShellComponent] // Bootstrap with AppShellComponent
})
export class AppModule { }

