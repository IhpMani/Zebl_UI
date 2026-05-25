import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { WORKSPACE_REPOSITORY } from './application/workspace.repository';
import { WorkspaceService } from './application/workspace.service';
import { LocalStorageWorkspaceRepository } from './infrastructure/local-storage-workspace.repository';

import { WorkspaceChromeTabsComponent } from './ui/workspace-tabs/workspace-tabs.component';
import { WorkspaceHostComponent } from './ui/workspace-host/workspace-host.component';

@NgModule({
  declarations: [WorkspaceChromeTabsComponent, WorkspaceHostComponent],
  imports: [CommonModule, RouterModule],
  exports: [WorkspaceChromeTabsComponent, WorkspaceHostComponent],
  providers: [
    WorkspaceService,
    LocalStorageWorkspaceRepository,
    { provide: WORKSPACE_REPOSITORY, useExisting: LocalStorageWorkspaceRepository }
  ]
})
export class WorkspaceModule {}

