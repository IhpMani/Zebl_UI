import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PatientClaimRowDto } from '../../models/patient-claim-row.dto';
import { PatientWorkspaceStateService } from '../../services/patient-workspace-state.service';
import { PatientWorkspaceSessionService } from '../../services/patient-workspace-session.service';
import { WorkspaceSlideoverService } from '../../../../shared/operational/services/workspace-slideover.service';
import { OperationalToastService } from '../../../../shared/operational/services/operational-toast.service';

@Component({
  selector: 'app-patient-claims-tab',
  templateUrl: './patient-claims-tab.component.html',
  styleUrls: ['./patient-tab.shared.css', '../patient-workspace.polish.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientClaimsTabComponent implements OnInit, OnDestroy {
  slice$ = this.state.slice$('claims');
  pageState$ = this.state.claimsPage$;
  rows$ = this.state.claimsTabRows$;
  expandedClaimId: number | null = null;

  private patId: number | null = null;

  constructor(
    readonly state: PatientWorkspaceStateService,
    private readonly session: PatientWorkspaceSessionService,
    private readonly slideover: WorkspaceSlideoverService,
    private readonly toast: OperationalToastService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.state.setActiveTab('claims');
    this.patId = this.state.context.patId;
    const snap = this.patId ? this.session.restore(this.patId) : null;
    if (snap?.expandedClaimId) this.expandedClaimId = snap.expandedClaimId;
    if (snap?.selectedClaimId) this.state.selectClaim(snap.selectedClaimId);
    if (snap && snap.claimsPage > 1) this.state.loadClaimsPage(snap.claimsPage);
  }

  ngOnDestroy(): void {
    this.persistSession();
  }

  toggleExpand(row: PatientClaimRowDto): void {
    this.expandedClaimId = this.expandedClaimId === row.claimId ? null : row.claimId;
    this.state.selectClaim(row.claimId);
    this.persistSession();
  }

  openClaimSlideover(row: PatientClaimRowDto): void {
    this.slideover.open({
      title: `Claim ${row.claimId}`,
      subtitle: row.status,
      width: 'md',
      context: {
        claimId: row.claimId,
        status: row.status,
        dos: row.dos,
        charges: row.charges,
        balance: row.balance
      }
    });
  }

  createClaim(): void {
    const patId = this.state.context.patId;
    if (patId) {
      void this.router.navigate(['/claims/new'], { queryParams: { patientId: patId } });
    } else {
      void this.router.navigate(['/claims/new']);
    }
    this.toast.info('Opening new claim');
  }

  prevPage(): void {
    const p = this.state.getClaimsPageState();
    if (p.page > 1) this.state.loadClaimsPage(p.page - 1);
  }

  nextPage(): void {
    const p = this.state.getClaimsPageState();
    const maxPage = Math.max(1, Math.ceil(p.totalCount / p.pageSize));
    if (p.page < maxPage) this.state.loadClaimsPage(p.page + 1);
  }

  trackRow(_: number, r: PatientClaimRowDto): number {
    return r.claimId;
  }

  retry(): void {
    const pg = this.state.getClaimsPageState();
    this.state.loadClaimsPage(pg.page);
  }

  private persistSession(): void {
    const patId = this.state.context.patId;
    if (!patId) return;
    const pg = this.state.getClaimsPageState();
    this.session.save(patId, {
      activeTabId: 'claims',
      selectedClaimId: this.state.context.selectedClaimId,
      selectedPaymentId: this.state.context.selectedPaymentId,
      claimsPage: pg.page,
      expandedClaimId: this.expandedClaimId,
      scrollTop: 0
    });
  }
}
