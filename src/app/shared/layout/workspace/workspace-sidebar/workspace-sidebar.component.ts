import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-workspace-sidebar',
  templateUrl: './workspace-sidebar.component.html',
  styleUrls: ['./workspace-sidebar.component.css', '../styles/workspace-primitives.css']
})
export class WorkspaceSidebarComponent {
  @Input() sticky = true;
}
