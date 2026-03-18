import { Component, EventEmitter, Output } from '@angular/core';
import { Observable } from 'rxjs';
import { WorkspaceService } from '../../application/workspace.service';
import { WorkspaceState } from '../../application/workspace.state';

@Component({
  selector: 'app-workspace-tabs',
  templateUrl: './workspace-tabs.component.html',
  styleUrls: ['./workspace-tabs.component.css']
})
export class WorkspaceTabsComponent {
  readonly state$: Observable<WorkspaceState> = this.workspace.state$;

  @Output() tabActivated = new EventEmitter<string>();
  @Output() tabClosed = new EventEmitter<string>();

  constructor(private readonly workspace: WorkspaceService) {}

  activate(tabId: string): void {
    this.workspace.activateTab(tabId);
    this.tabActivated.emit(tabId);
  }

  close(tabId: string, ev: MouseEvent): void {
    ev.stopPropagation();
    this.workspace.closeTab(tabId);
    this.tabClosed.emit(tabId);
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }
}

