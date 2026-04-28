import { Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
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
  @ViewChild('tabContainer') tabContainer!: ElementRef<HTMLDivElement>;

  @Output() tabActivated = new EventEmitter<string>();
  @Output() tabClosed = new EventEmitter<string>();

  constructor(private readonly workspace: WorkspaceService) {}

  activate(tabId: string): void {
    this.workspace.activateTab(tabId);
    this.tabActivated.emit(tabId);
    this.scrollActiveTabIntoView();
  }

  close(tabId: string, ev: MouseEvent): void {
    ev.stopPropagation();
    this.workspace.closeTab(tabId);
    this.tabClosed.emit(tabId);
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  scrollTabs(direction: 'left' | 'right'): void {
    if (!this.tabContainer?.nativeElement) return;
    const scrollAmount = 200;
    this.tabContainer.nativeElement.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  }

  private scrollActiveTabIntoView(): void {
    setTimeout(() => {
      const active = this.tabContainer?.nativeElement?.querySelector('.active-tab');
      if (active) {
        (active as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }, 0);
  }
}

