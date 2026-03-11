import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CodeLibraryPageComponent } from './code-library-page.component';
import { AuthGuard } from '../../core/guards/auth.guard';

const routes: Routes = [
  { path: '', component: CodeLibraryPageComponent, canActivate: [AuthGuard] }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CodeLibraryRoutingModule {}
