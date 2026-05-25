import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ClaimServiceLineRowDto } from '../../models/claim-service-line-row.dto';
import { ClaimWorkspaceStateService } from '../../services/claim-workspace-state.service';
import { WorkspaceSlideoverService } from '../../../../shared/operational/services/workspace-slideover.service';

@Component({
  selector: 'app-claim-service-lines-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './claim-service-lines-grid.component.html',
  styleUrls: ['../claim-workspace.shared.css']
})
export class ClaimServiceLinesGridComponent implements OnInit {
  rows$ = this.state.serviceLines$;
  slice$ = this.state.slice$('serviceLines');
  expandedId$ = this.state.expandedServiceLineId$;

  constructor(
    readonly state: ClaimWorkspaceStateService,
    private readonly slideover: WorkspaceSlideoverService
  ) {}

  ngOnInit(): void {
    this.state.ensureFinancialPanelsLoaded();
  }

  toggle(row: ClaimServiceLineRowDto): void {
    this.state.toggleServiceLineExpand(row.serviceLineId);
  }

  preview(row: ClaimServiceLineRowDto): void {
    this.slideover.open({
      title: `Service line ${row.serviceLineId}`,
      subtitle: row.procedureCode,
      context: {
        claimId: null,
        serviceLineId: row.serviceLineId,
        dos: row.dos,
        charges: row.charges,
        balance: row.remainingBalance,
        status: row.responsibleParty
      }
    });
  }

  trackRow(_: number, r: ClaimServiceLineRowDto): number {
    return r.serviceLineId;
  }
}
