import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ClaimWorkspaceStateService } from '../../services/claim-workspace-state.service';

@Component({
  selector: 'app-claim-lifecycle-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './claim-lifecycle-panel.component.html',
  styleUrls: ['../claim-workspace.shared.css']
})
export class ClaimLifecyclePanelComponent {
  lifecycle$ = this.state.lifecycle$;
  slice$ = this.state.slice$('lifecycle');

  constructor(readonly state: ClaimWorkspaceStateService) {}
}
