import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProcedureCodeLibraryPageComponent } from './procedure-code-library-page.component';

const routes: Routes = [
  { path: '', component: ProcedureCodeLibraryPageComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProcedureCodeLibraryRoutingModule {}
