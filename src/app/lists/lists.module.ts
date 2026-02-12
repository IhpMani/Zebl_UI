import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { ListLibraryComponent } from './list-library/list-library.component';
import { AuthGuard } from '../core/guards/auth.guard';

const routes: Routes = [
  {
    path: 'list-library',
    component: ListLibraryComponent,
    canActivate: [AuthGuard]
  }
];

@NgModule({
  declarations: [
    ListLibraryComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes)
  ]
})
export class ListsModule { }
