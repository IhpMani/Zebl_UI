import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CodeLibraryRoutingModule } from './code-library-routing.module';
import { CodeLibraryPageComponent } from './code-library-page.component';
import { CodeLibraryTabsComponent } from './code-library-tabs.component';
import { CodeLibraryGridComponent } from './code-library-grid.component';
import { CodeImportDialogComponent } from './code-import-dialog.component';
import { CodeEditDialogComponent } from './code-edit-dialog.component';
import { CodeLookupDialogComponent } from './code-lookup-dialog.component';

@NgModule({
  declarations: [
    CodeLibraryPageComponent,
    CodeLibraryTabsComponent,
    CodeLibraryGridComponent,
    CodeImportDialogComponent,
    CodeEditDialogComponent,
    CodeLookupDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    CodeLibraryRoutingModule
  ],
  exports: [CodeLookupDialogComponent]
})
export class CodeLibraryModule {}
