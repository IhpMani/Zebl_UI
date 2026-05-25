import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ClaimWorkspaceStateService } from '../../services/claim-workspace-state.service';

@Component({
  selector: 'app-claim-timeline-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './claim-timeline-panel.component.html',
  styleUrls: ['../claim-workspace.shared.css']
})
export class ClaimTimelinePanelComponent {
  timeline$ = this.state.timeline$;
  slice$ = this.state.slice$('timeline');

  constructor(readonly state: ClaimWorkspaceStateService) {}
}
