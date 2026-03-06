import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProcedureCodeLibraryRoutingModule } from './procedure-code-library-routing.module';
import { ProcedureCodeLibraryPageComponent } from './procedure-code-library-page.component';
import { ModifyProcedureCodeDialogComponent } from './modify-procedure-code-dialog.component';
import { RateClassSelectorDialogComponent } from './rate-class-selector-dialog.component';

@NgModule({
  declarations: [
    ProcedureCodeLibraryPageComponent,
    ModifyProcedureCodeDialogComponent,
    RateClassSelectorDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ProcedureCodeLibraryRoutingModule
  ]
})
export class ProcedureCodeLibraryModule {}
