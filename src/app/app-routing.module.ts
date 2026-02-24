import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClaimListComponent } from './claims/claim-list/claim-list.component';
import { ClaimDetailsComponent } from './claims/claim-details/claim-details.component';
import { HomeComponent } from './home/home.component';
import { PatientListComponent } from './patients/patient-list/patient-list.component';
import { PatientDetailsComponent } from './patients/patient-details/patient-details.component';
import { ServiceListComponent } from './services/service-list/service-list.component';
import { PaymentListComponent } from './payments/payment-list/payment-list.component';
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

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'admin/users', component: UserManagementComponent, canActivate: [AdminGuard] },

  { path: '', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'claims/find-claim', component: ClaimListComponent, canActivate: [AuthGuard] },
  { path: 'claims/:id', component: ClaimDetailsComponent, canActivate: [AuthGuard] },
  { path: 'patients/find-patient', component: PatientListComponent, canActivate: [AuthGuard] },
  { path: 'patients/:patId', component: PatientDetailsComponent, canActivate: [AuthGuard] },
  { path: 'services/find-service', component: ServiceListComponent, canActivate: [AuthGuard] },
  { path: 'payments/find-payment', component: PaymentListComponent, canActivate: [AuthGuard] },
  { path: 'adjustments/find-adjustment', component: AdjustmentListComponent, canActivate: [AuthGuard] },
  { path: 'payers/find-payer', component: PayerListComponent, canActivate: [AuthGuard] },
  { path: 'physicians/find-physician', component: PhysicianListComponent, canActivate: [AuthGuard] },
  { path: 'physicians', component: PhysicianLibraryComponent, canActivate: [AuthGuard] },
  { path: 'disbursements/find-disbursement', component: DisbursementListComponent, canActivate: [AuthGuard] },
  { path: 'claim-notes/find-claim-note', component: ClaimNoteListComponent, canActivate: [AuthGuard] },
  { path: 'edi-reports', component: EdiReportsComponent, canActivate: [AuthGuard] },
  { path: 'lists', loadChildren: () => import('./lists/lists.module').then(m => m.ListsModule) },
  { path: 'receiver-library', loadChildren: () => import('./features/receiver-library/receiver-library.module').then(m => m.ReceiverLibraryModule), canActivate: [AuthGuard] },
  { path: 'connection-library', loadChildren: () => import('./features/connection-library/connection-library.module').then(m => m.ConnectionLibraryModule), canActivate: [AuthGuard] },
  { path: 'payer-library', loadChildren: () => import('./features/payer-library/payer-library.module').then(m => m.PayerLibraryModule), canActivate: [AuthGuard] },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
