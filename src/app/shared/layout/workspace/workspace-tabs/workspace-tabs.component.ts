import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface WorkspaceTabItem {
  id: string;
  label: string;
  disabled?: boolean;
}

/** In-page workspace section tabs (overview / claims / payments). */
@Component({
  selector: 'app-workspace-page-tabs',
  templateUrl: './workspace-tabs.component.html',
  styleUrls: ['./workspace-tabs.component.css', '../styles/workspace-primitives.css']
})
export class WorkspacePageTabsComponent {
  @Input() tabs: WorkspaceTabItem[] = [];
  @Input() activeTabId = '';
  @Output() tabChange = new EventEmitter<string>();

  selectTab(tab: WorkspaceTabItem): void {
    if (tab.disabled || tab.id === this.activeTabId) {
      return;
    }
    this.tabChange.emit(tab.id);
  }
}
