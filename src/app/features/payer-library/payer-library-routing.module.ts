import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PayerLibraryListComponent } from './payer-library-list.component';
import { PayerLibraryFormComponent } from './payer-library-form.component';

const routes: Routes = [
  {
    path: '',
    component: PayerLibraryListComponent,
    children: [
      { path: 'new', component: PayerLibraryFormComponent },
      { path: ':id', component: PayerLibraryFormComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PayerLibraryRoutingModule {}
