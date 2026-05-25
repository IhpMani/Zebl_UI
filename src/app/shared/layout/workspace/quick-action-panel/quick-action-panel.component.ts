import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-quick-action-panel',
  templateUrl: './quick-action-panel.component.html',
  styleUrls: ['./quick-action-panel.component.css', '../styles/workspace-primitives.css']
})
export class QuickActionPanelComponent {
  @Input() title = 'Quick Actions';
}
