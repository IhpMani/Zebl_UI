import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { PayerLibraryListComponent } from './payer-library-list.component';
import { PayerLibraryFormComponent } from './payer-library-form.component';
import { PayerLibraryEmbedComponent } from './payer-library-embed.component';
import { PayerLibraryRoutingModule } from './payer-library-routing.module';

@NgModule({
  declarations: [
    PayerLibraryListComponent,
    PayerLibraryFormComponent,
    PayerLibraryEmbedComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    PayerLibraryRoutingModule
  ],
  exports: [PayerLibraryFormComponent, PayerLibraryEmbedComponent]
})
export class PayerLibraryModule {}
