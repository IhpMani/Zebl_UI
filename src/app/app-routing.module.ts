import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClaimListComponent } from './claims/claim-list/claim-list.component';
import { ClaimDetailsComponent } from './claims/claim-details/claim-details.component';
import { HomeComponent } from './home/home.component';
import { PatientListComponent } from './patients/patient-list/patient-list.component';
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
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';
import { EdiReportsComponent } from './edi-reports/edi-reports.component';
import { EraExceptionsComponent } from './features/era-exceptions/era-exceptions.component';
import { ClaimRejectionsComponent } from './features/claim-rejections/claim-rejections.component';
import { ProcedureCodesPageComponent } from './procedure-codes/procedure-codes-page.component';
import { PatientEligibilityComponent } from './patients/patient-eligibility/patient-eligibility.component';
import { SuperAdminComponent } from './super-admin/super-admin.component';
import { SuperAdminGuard } from './core/guards/super-admin.guard';
import { UnauthorizedComponent } from './unauthorized/unauthorized.component';
import { InterfaceDataReviewComponent } from './hl7/interface-data-review/interface-data-review.component';
import { SendClaimsComponent } from './claims/send-claims/send-claims.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'unauthorized', component: UnauthorizedComponent },
  { path: 'admin/users', component: UserManagementComponent, canActivate: [AdminGuard] },
  { path: 'super-admin', component: SuperAdminComponent, canActivate: [SuperAdminGuard] },

  { path: '', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'dashboard', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'claims/find-claim', component: ClaimListComponent, canActivate: [AuthGuard] },
  { path: 'claims/send', component: SendClaimsComponent, canActivate: [AuthGuard] },
  { path: 'claims/new', component: ClaimDetailsComponent, canActivate: [AuthGuard] },
  { path: 'claims/:id', component: ClaimDetailsComponent, canActivate: [AuthGuard] },
  { path: 'patients/find-patient', component: PatientListComponent, canActivate: [AuthGuard] },
  { path: 'patients/new', component: PatientDetailsComponent, canActivate: [AuthGuard] },
  { path: 'patients/:patId', component: PatientDetailsComponent, canActivate: [AuthGuard] },
  { path: 'patients/:patId/eligibility', component: PatientEligibilityComponent, canActivate: [AuthGuard] },
  { path: 'services/find-service', component: ServiceListComponent, canActivate: [AuthGuard] },
  { path: 'payments/entry/:id', component: PaymentEntryComponent, canActivate: [AuthGuard] },
  { path: 'payments/entry', component: PaymentEntryComponent, canActivate: [AuthGuard] },
  { path: 'payments/find-payment', component: PaymentListComponent, canActivate: [AuthGuard] },
  { path: 'payments/ledger', component: PaymentsLedgerComponent, canActivate: [AuthGuard] },
  { path: 'payments/era-exceptions', component: EraExceptionsComponent, canActivate: [AuthGuard] },
  { path: 'claims/rejections', component: ClaimRejectionsComponent, canActivate: [AuthGuard] },
  { path: 'adjustments/find-adjustment', component: AdjustmentListComponent, canActivate: [AuthGuard] },
  { path: 'payers/find-payer', component: PayerListComponent, canActivate: [AuthGuard] },
  { path: 'physicians/find-physician', component: PhysicianListComponent, canActivate: [AuthGuard] },
  { path: 'physicians', component: PhysicianLibraryComponent, canActivate: [AuthGuard] },
  { path: 'disbursements/find-disbursement', component: DisbursementListComponent, canActivate: [AuthGuard] },
  { path: 'claim-notes/find-claim-note', component: ClaimNoteListComponent, canActivate: [AuthGuard] },
  { path: 'edi-reports', component: EdiReportsComponent, canActivate: [AuthGuard] },
  { path: 'interface-data-review', component: InterfaceDataReviewComponent, canActivate: [AuthGuard] },
  { path: 'procedure-codes', component: ProcedureCodesPageComponent, canActivate: [AuthGuard] },
  { path: 'lists', loadChildren: () => import('./lists/lists.module').then(m => m.ListsModule) },
  { path: 'receiver-library', loadChildren: () => import('./features/receiver-library/receiver-library.module').then(m => m.ReceiverLibraryModule), canActivate: [AuthGuard] },
  { path: 'connection-library', loadChildren: () => import('./features/connection-library/connection-library.module').then(m => m.ConnectionLibraryModule), canActivate: [AuthGuard] },
  { path: 'payer-library', loadChildren: () => import('./features/payer-library/payer-library.module').then(m => m.PayerLibraryModule), canActivate: [AuthGuard] },
  { path: 'libraries/procedure-codes', loadChildren: () => import('./features/procedure-code-library/procedure-code-library.module').then(m => m.ProcedureCodeLibraryModule), canActivate: [AuthGuard] },
  { path: 'libraries/city-state-zip', loadChildren: () => import('./features/city-state-zip-library/city-state-zip-library.module').then(m => m.CityStateZipLibraryModule), canActivate: [AuthGuard] },
  { path: 'code-library', loadChildren: () => import('./features/code-library/code-library.module').then(m => m.CodeLibraryModule), canActivate: [AuthGuard] },
  { path: 'claim-template-library', loadChildren: () => import('./features/claim-template-library/claim-template-library.module').then(m => m.ClaimTemplateLibraryModule), canActivate: [AuthGuard] },
  { path: 'tools/program-setup', loadComponent: () => import('./features/program-setup/program-setup-page.component').then(m => m.ProgramSetupPageComponent), canActivate: [AuthGuard] },
  { path: 'libraries', redirectTo: '', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
