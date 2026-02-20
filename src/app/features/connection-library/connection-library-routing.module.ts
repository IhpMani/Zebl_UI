import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConnectionLibraryListComponent } from './connection-library-list.component';
import { ConnectionLibraryDetailComponent } from './connection-library-detail.component';

const routes: Routes = [
  {
    path: '',
    component: ConnectionLibraryListComponent,
    children: [
      {
        path: 'new',
        component: ConnectionLibraryDetailComponent
      },
      {
        path: ':id',
        component: ConnectionLibraryDetailComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConnectionLibraryRoutingModule { }
