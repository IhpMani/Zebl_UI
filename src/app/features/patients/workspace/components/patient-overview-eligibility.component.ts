import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { PatientEligibilitySnapshotDto } from '../../models/patient-eligibility-snapshot.dto';
import { PatientWorkspaceStateService } from '../../services/patient-workspace-state.service';
import { PatientEligibilityFlowService } from '../../services/patient-eligibility-flow.service';
import { PatientEligibilityRefreshService } from '../../services/patient-eligibility-refresh.service';
import {
  eligibilityPillClass,
  formatEligibilityDateLabel,
  formatEligibilityVerifiedAt,
  formatProviderCompact
} from '../../utils/eligibility-display.util';

@Component({
  selector: 'app-patient-overview-eligibility',
  templateUrl: './patient-overview-eligibility.component.html',
  styleUrls: ['./patient-overview-eligibility.component.css', '../patient-workspace.polish.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientOverviewEligibilityComponent implements OnInit, OnDestroy {
  snapshot$ = this.state.eligibilitySnapshot$;
  slice$ = this.state.slice$('eligibilitySnapshot');
  modal$ = this.flow.response$;

  private readonly destroy$ = new Subject<void>();
  private inFlightPollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    readonly state: PatientWorkspaceStateService,
    readonly flow: PatientEligibilityFlowService,
    private readonly refreshBus: PatientEligibilityRefreshService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.refreshBus.changed$
      .pipe(
        filter((id) => id === this.state.context.patId),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.state.reloadEligibilitySnapshot());

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', this.onWindowFocus);
    }
  }

  ngOnDestroy(): void {
    this.stopInFlightPolling();
    this.destroy$.next();
    this.destroy$.complete();
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', this.onWindowFocus);
    }
  }

  pillClass(snapshot: PatientEligibilitySnapshotDto): string {
    return eligibilityPillClass(snapshot.displayStatus);
  }

  verifiedLabel(snapshot: PatientEligibilitySnapshotDto): string | null {
    return formatEligibilityVerifiedAt(snapshot.lastCheckAt);
  }

  providerLabel(snapshot: PatientEligibilitySnapshotDto): string | null {
    return formatProviderCompact(snapshot.providerNpi, snapshot.providerMode);
  }

  eligibilityDateLabel(snapshot: PatientEligibilitySnapshotDto): string | null {
    return (
      formatEligibilityDateLabel(snapshot.eligibilityDate, snapshot.eligibilityEndDate) ??
      formatEligibilityDateLabel(snapshot.lastCheckAt, null)
    );
  }

  check(snapshot: PatientEligibilitySnapshotDto): void {
    const patId = this.state.context.patId;
    if (!patId || !snapshot.canCheck) return;
    const header = this.state.getHeaderSnapshot();
    this.flow.checkEligibility({
      patientId: patId,
      patientName: header?.patientName,
      payerName: snapshot.payerName,
      memberId: snapshot.memberId,
      planName: snapshot.planName
    });
    this.cdr.markForCheck();
  }

  view(snapshot: PatientEligibilitySnapshotDto): void {
    const patId = this.state.context.patId;
    if (!patId || !snapshot.canView) return;
    const inquiryId = snapshot.inFlightInquiryId ?? snapshot.latestInquiryId;
    this.flow.viewEligibility(patId, inquiryId);
    this.cdr.markForCheck();
  }

  closeModal(): void {
    this.flow.closeModal();
    this.state.reloadEligibilitySnapshot();
    this.cdr.markForCheck();
  }

  private readonly onWindowFocus = (): void => {
    if (this.state.context.activeTabId === 'overview' && this.state.context.patId) {
      this.state.reloadEligibilitySnapshot();
    }
  };

  private startInFlightPolling(): void {
    if (this.inFlightPollTimer != null) return;
    this.inFlightPollTimer = setInterval(() => this.state.reloadEligibilitySnapshot(), 5000);
  }

  private stopInFlightPolling(): void {
    if (this.inFlightPollTimer != null) {
      clearInterval(this.inFlightPollTimer);
      this.inFlightPollTimer = null;
    }
  }
}
