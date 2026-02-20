import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ReceiverLibraryListComponent } from './receiver-library-list.component';
import { ReceiverLibraryDetailComponent } from './receiver-library-detail.component';
import { ReceiverLibraryRoutingModule } from './receiver-library-routing.module';

@NgModule({
  declarations: [
    ReceiverLibraryListComponent,
    ReceiverLibraryDetailComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ReceiverLibraryRoutingModule
  ]
})
export class ReceiverLibraryModule { }
