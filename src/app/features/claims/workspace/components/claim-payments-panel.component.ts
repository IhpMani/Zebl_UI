import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ClaimWorkspaceStateService } from '../../services/claim-workspace-state.service';

@Component({
  selector: 'app-claim-payments-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './claim-payments-panel.component.html'
})
export class ClaimPaymentsPanelComponent implements OnInit {
  rows$ = this.state.payments$;
  slice$ = this.state.slice$('payments');

  constructor(readonly state: ClaimWorkspaceStateService) {}

  ngOnInit(): void {
    this.state.ensureFinancialPanelsLoaded();
  }
}
