import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ClaimWorkspaceStateService } from '../../services/claim-workspace-state.service';

@Component({
  selector: 'app-claim-financial-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './claim-financial-summary.component.html',
  styleUrls: ['../claim-workspace.shared.css']
})
export class ClaimFinancialSummaryComponent {
  financial$ = this.state.financial$;
  slice$ = this.state.slice$('financial');

  constructor(readonly state: ClaimWorkspaceStateService) {}
}
