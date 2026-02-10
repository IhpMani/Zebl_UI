import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClaimListComponent } from './claims/claim-list/claim-list.component';
import { ClaimDetailsComponent } from './claims/claim-details/claim-details.component';
import { HomeComponent } from './home/home.component';
import { PatientListComponent } from './patients/patient-list/patient-list.component';
import { ServiceListComponent } from './services/service-list/service-list.component';
import { PaymentListComponent } from './payments/payment-list/payment-list.component';
import { AdjustmentListComponent } from './adjustments/adjustment-list/adjustment-list.component';
import { PayerListComponent } from './payers/payer-list/payer-list.component';
import { PhysicianListComponent } from './physicians/physician-list/physician-list.component';
import { PhysicianLibraryComponent } from './physicians/physician-library/physician-library.component';
import { DisbursementListComponent } from './disbursements/disbursement-list/disbursement-list.component';
import { ClaimNoteListComponent } from './claim-notes/claim-note-list/claim-note-list.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'claims/find-claim', component: ClaimListComponent },
  { path: 'claims/:id', component: ClaimDetailsComponent },
  { path: 'patients/find-patient', component: PatientListComponent },
  { path: 'services/find-service', component: ServiceListComponent },
  { path: 'payments/find-payment', component: PaymentListComponent },
  { path: 'adjustments/find-adjustment', component: AdjustmentListComponent },
  { path: 'payers/find-payer', component: PayerListComponent },
  { path: 'physicians/find-physician', component: PhysicianListComponent },
  { path: 'physicians', component: PhysicianLibraryComponent },
  { path: 'disbursements/find-disbursement', component: DisbursementListComponent },
  { path: 'claim-notes/find-claim-note', component: ClaimNoteListComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
