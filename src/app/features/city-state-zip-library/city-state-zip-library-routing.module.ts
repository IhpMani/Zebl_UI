import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { CityStateZipLibraryPageComponent } from './city-state-zip-library-page.component';

const routes: Routes = [
  { path: '', component: CityStateZipLibraryPageComponent, canActivate: [AuthGuard] }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CityStateZipLibraryRoutingModule {}

