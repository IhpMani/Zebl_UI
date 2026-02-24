import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { PayerLibraryListComponent } from './payer-library-list.component';
import { PayerLibraryFormComponent } from './payer-library-form.component';
import { PayerLibraryRoutingModule } from './payer-library-routing.module';

@NgModule({
  declarations: [
    PayerLibraryListComponent,
    PayerLibraryFormComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    PayerLibraryRoutingModule
  ]
})
export class PayerLibraryModule {}
