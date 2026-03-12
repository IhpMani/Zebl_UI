import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClaimTemplateLibraryPageComponent } from './claim-template-library-page.component';
import { AuthGuard } from '../../core/guards/auth.guard';

const routes: Routes = [
  { path: '', component: ClaimTemplateLibraryPageComponent, canActivate: [AuthGuard] }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ClaimTemplateLibraryRoutingModule {}

