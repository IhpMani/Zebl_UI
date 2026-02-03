import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppShellComponent } from './app-shell/app-shell.component';
import { RibbonComponent } from './ribbon/ribbon.component';
import { ClaimListComponent } from './claims/claim-list/claim-list.component';
import { ClaimDetailsComponent } from './claims/claim-details/claim-details.component';
import { HomeComponent } from './home/home.component';
import { PatientListComponent } from './patients/patient-list/patient-list.component';
import { ServiceListComponent } from './services/service-list/service-list.component';
import { PaymentListComponent } from './payments/payment-list/payment-list.component';
import { AdjustmentListComponent } from './adjustments/adjustment-list/adjustment-list.component';
import { PayerListComponent } from './payers/payer-list/payer-list.component';
import { PhysicianListComponent } from './physicians/physician-list/physician-list.component';
import { DisbursementListComponent } from './disbursements/disbursement-list/disbursement-list.component';
import { ClaimNoteListComponent } from './claim-notes/claim-note-list/claim-note-list.component';

@NgModule({
  declarations: [
    AppShellComponent,
    RibbonComponent,
    ClaimListComponent,
    ClaimDetailsComponent,
    HomeComponent,
    PatientListComponent,
    ServiceListComponent,
    PaymentListComponent,
    AdjustmentListComponent,
    PayerListComponent,
    PhysicianListComponent,
    DisbursementListComponent,
    ClaimNoteListComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppShellComponent] // Bootstrap with AppShellComponent
})
export class AppModule { }

