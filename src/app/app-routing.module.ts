import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClaimListComponent } from './claims/claim-list/claim-list.component';
import { HomeComponent } from './home/home.component'; // New import for HomeComponent

const routes: Routes = [
  { path: '', component: HomeComponent }, // Root path loads HomeComponent
  { path: 'claims/find-claim', component: ClaimListComponent },
  // Add other routes here later
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
