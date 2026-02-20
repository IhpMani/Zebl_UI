import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ConnectionLibraryListComponent } from './connection-library-list.component';
import { ConnectionLibraryDetailComponent } from './connection-library-detail.component';
import { ConnectionLibraryRoutingModule } from './connection-library-routing.module';

@NgModule({
  declarations: [
    ConnectionLibraryListComponent,
    ConnectionLibraryDetailComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ConnectionLibraryRoutingModule
  ]
})
export class ConnectionLibraryModule { }
