import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkspaceShellComponent } from './workspace-shell/workspace-shell.component';
import { WorkspaceHeaderComponent } from './workspace-header/workspace-header.component';
import { WorkspacePageTabsComponent } from './workspace-tabs/workspace-tabs.component';
import { WorkspaceSidebarComponent } from './workspace-sidebar/workspace-sidebar.component';
import { WorkspaceContentComponent } from './workspace-content/workspace-content.component';
import { WorkspacePanelComponent } from './workspace-panel/workspace-panel.component';
import { DataCardComponent } from './data-card/data-card.component';
import { MetricCardComponent } from './metric-card/metric-card.component';
import { WorkspaceSectionHeaderComponent } from './workspace-section-header/workspace-section-header.component';
import { QuickActionPanelComponent } from './quick-action-panel/quick-action-panel.component';

@NgModule({
  declarations: [
    WorkspaceShellComponent,
    WorkspaceHeaderComponent,
    WorkspacePageTabsComponent,
    WorkspaceSidebarComponent,
    WorkspaceContentComponent,
    WorkspacePanelComponent,
    DataCardComponent,
    MetricCardComponent,
    WorkspaceSectionHeaderComponent,
    QuickActionPanelComponent
  ],
  imports: [CommonModule],
  exports: [
    WorkspaceShellComponent,
    WorkspaceHeaderComponent,
    WorkspacePageTabsComponent,
    WorkspaceSidebarComponent,
    WorkspaceContentComponent,
    WorkspacePanelComponent,
    DataCardComponent,
    MetricCardComponent,
    WorkspaceSectionHeaderComponent,
    QuickActionPanelComponent
  ]
})
export class WorkspaceLayoutModule {}
