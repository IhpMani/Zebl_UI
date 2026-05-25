import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ClaimWorkspaceStateService } from '../services/claim-workspace-state.service';
import { WorkspaceService } from '../../../workspace/application/workspace.service';
import { RibbonContextService } from '../../../core/services/ribbon-context.service';

@Component({
  selector: 'app-claims-workspace-page',
  templateUrl: './claims-workspace-page.component.html',
  styleUrls: ['./claims-workspace-page.component.css', './claim-workspace.shared.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClaimsWorkspacePageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    readonly state: ClaimWorkspaceStateService,
    private readonly workspace: WorkspaceService,
    private readonly ribbonContext: RibbonContextService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = Number(params.get('claimId'));
      if (!Number.isFinite(id) || id <= 0) return;
      this.state.openClaim(id);
    });

    this.state.header$.pipe(takeUntil(this.destroy$)).subscribe((h) => {
      if (h) {
        this.workspace.updateActiveTabTitle(`Claim ${h.claimId}`);
        this.ribbonContext.setContext({
          claimId: h.claimId,
          patientId: h.patientId,
          patientName: h.patientName
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
