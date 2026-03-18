import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { WORKSPACE_REPOSITORY } from './application/workspace.repository';
import { WorkspaceService } from './application/workspace.service';
import { LocalStorageWorkspaceRepository } from './infrastructure/local-storage-workspace.repository';

import { WorkspaceTabsComponent } from './ui/workspace-tabs/workspace-tabs.component';
import { WorkspaceHostComponent } from './ui/workspace-host/workspace-host.component';

@NgModule({
  declarations: [WorkspaceTabsComponent, WorkspaceHostComponent],
  imports: [CommonModule, RouterModule],
  exports: [WorkspaceTabsComponent, WorkspaceHostComponent],
  providers: [
    WorkspaceService,
    LocalStorageWorkspaceRepository,
    { provide: WORKSPACE_REPOSITORY, useExisting: LocalStorageWorkspaceRepository }
  ]
})
export class WorkspaceModule {}

