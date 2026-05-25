import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ClaimWorkspaceStateService } from '../../services/claim-workspace-state.service';

@Component({
  selector: 'app-claim-adjustments-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './claim-adjustments-panel.component.html'
})
export class ClaimAdjustmentsPanelComponent implements OnInit {
  rows$ = this.state.adjustments$;
  slice$ = this.state.slice$('adjustments');

  constructor(readonly state: ClaimWorkspaceStateService) {}

  ngOnInit(): void {
    this.state.ensureFinancialPanelsLoaded();
  }
}
