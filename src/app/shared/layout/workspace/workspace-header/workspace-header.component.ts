import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-workspace-header',
  templateUrl: './workspace-header.component.html',
  styleUrls: ['./workspace-header.component.css', '../styles/workspace-primitives.css']
})
export class WorkspaceHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
}
