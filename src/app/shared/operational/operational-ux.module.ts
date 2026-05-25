import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OperationalToastHostComponent } from './components/operational-toast-host.component';
import { WorkspaceSlideoverComponent } from './components/workspace-slideover.component';
import { OperationalStatusBadgeComponent } from './components/operational-status-badge.component';
import { OperationalEmptyStateComponent } from './components/operational-empty-state.component';
import { BroadbillKeyboardHostComponent } from './components/broadbill-keyboard-host.component';

@NgModule({
  declarations: [
    OperationalToastHostComponent,
    WorkspaceSlideoverComponent,
    OperationalStatusBadgeComponent,
    OperationalEmptyStateComponent,
    BroadbillKeyboardHostComponent
  ],
  imports: [CommonModule, RouterModule],
  exports: [
    OperationalToastHostComponent,
    WorkspaceSlideoverComponent,
    OperationalStatusBadgeComponent,
    OperationalEmptyStateComponent,
    BroadbillKeyboardHostComponent
  ]
})
export class OperationalUxModule {}
