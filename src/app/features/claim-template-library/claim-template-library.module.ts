import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClaimTemplateLibraryRoutingModule } from './claim-template-library-routing.module';
import { ClaimTemplateLibraryPageComponent } from './claim-template-library-page.component';

@NgModule({
  declarations: [
    ClaimTemplateLibraryPageComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ClaimTemplateLibraryRoutingModule
  ]
})
export class ClaimTemplateLibraryModule {}

