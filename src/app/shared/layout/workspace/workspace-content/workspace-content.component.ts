import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-workspace-content',
  templateUrl: './workspace-content.component.html',
  styleUrls: ['./workspace-content.component.css', '../styles/workspace-primitives.css']
})
export class WorkspaceContentComponent {
  /** Right rail width, e.g. "320px" or "30%" */
  @Input() sidebarWidth = '320px';
  @Input() showSidebar = true;
}
