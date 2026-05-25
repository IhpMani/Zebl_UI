import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-workspace-section-header',
  templateUrl: './workspace-section-header.component.html',
  styleUrls: ['./workspace-section-header.component.css', '../styles/workspace-primitives.css']
})
export class WorkspaceSectionHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
}
