import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-workspace-panel',
  templateUrl: './workspace-panel.component.html',
  styleUrls: ['./workspace-panel.component.css', '../styles/workspace-primitives.css']
})
export class WorkspacePanelComponent {
  @Input() title = '';
  @Input() padded = true;
}
