import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReceiverLibraryListComponent } from './receiver-library-list.component';
import { ReceiverLibraryDetailComponent } from './receiver-library-detail.component';
import { AuthGuard } from '../../core/guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    component: ReceiverLibraryListComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'new',
        component: ReceiverLibraryDetailComponent
      },
      {
        path: ':id',
        component: ReceiverLibraryDetailComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReceiverLibraryRoutingModule { }
