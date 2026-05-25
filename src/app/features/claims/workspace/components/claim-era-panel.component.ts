import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ClaimWorkspaceStateService } from '../../services/claim-workspace-state.service';

@Component({
  selector: 'app-claim-era-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './claim-era-panel.component.html'
})
export class ClaimEraPanelComponent {
  era$ = this.state.era$;
  slice$ = this.state.slice$('era');

  constructor(readonly state: ClaimWorkspaceStateService) {}
}
