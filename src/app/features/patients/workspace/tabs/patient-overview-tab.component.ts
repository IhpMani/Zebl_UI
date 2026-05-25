import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PatientRecentClaimDto } from '../../models/patient-recent-claim.dto';
import { PatientRecentPaymentDto } from '../../models/patient-recent-payment.dto';
import { PatientAgingSummaryDto } from '../../models/patient-aging-summary.dto';
import { PatientWorkspaceStateService } from '../../services/patient-workspace-state.service';

interface AgingBucketView {
  label: string;
  amount: number;
  pct: number;
}

@Component({
  selector: 'app-patient-overview-tab',
  templateUrl: './patient-overview-tab.component.html',
  styleUrls: ['./patient-tab.shared.css', '../patient-workspace.polish.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientOverviewTabComponent implements OnInit {
  financial$ = this.state.financial$;
  claimsPreview$ = this.state.claimsPreview$;
  recentPayments$ = this.state.recentPayments$;
  insuranceSummary$ = this.state.insuranceSummary$;
  aging$ = this.state.aging$;
  financialSlice$ = this.state.slice$('financial');
  claimsSlice$ = this.state.slice$('claimsPreview');
  paymentsSlice$ = this.state.slice$('recentPayments');
  insuranceSlice$ = this.state.slice$('insuranceSummary');
  agingSlice$ = this.state.slice$('aging');

  constructor(
    readonly state: PatientWorkspaceStateService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.state.setActiveTab('overview');
  }

  trackClaim(_: number, r: PatientRecentClaimDto): number {
    return r.claimId;
  }

  trackPayment(_: number, p: PatientRecentPaymentDto): number {
    return p.paymentId;
  }

  agingBuckets(aging: PatientAgingSummaryDto): AgingBucketView[] {
    const items = [
      { label: '0–30', amount: aging.bucket0To30 ?? 0 },
      { label: '31–60', amount: aging.bucket31To60 ?? 0 },
      { label: '61–90', amount: aging.bucket61To90 ?? 0 },
      { label: '91–120', amount: aging.bucket91To120 ?? 0 },
      { label: '120+', amount: aging.bucket120Plus ?? 0 }
    ];
    const max = Math.max(...items.map((i) => i.amount), 1);
    return items.map((i) => ({ ...i, pct: Math.round((i.amount / max) * 100) }));
  }

  goNewClaim(): void {
    const patId = this.state.context.patId;
    if (patId) void this.router.navigate(['/claims/new'], { queryParams: { patientId: patId } });
    else void this.router.navigate(['/claims/new']);
  }

  goPaymentEntry(): void {
    const patId = this.state.context.patId;
    if (patId) void this.router.navigate(['/payments/entry'], { queryParams: { patientId: patId } });
    else void this.router.navigate(['/payments/entry']);
  }

  goClaimsTab(): void {
    const patId = this.state.context.patId;
    if (patId) void this.router.navigate(['/patients', patId, 'workspace', 'claims']);
  }

  goPaymentsTab(): void {
    const patId = this.state.context.patId;
    if (patId) void this.router.navigate(['/patients', patId, 'workspace', 'payments']);
  }

  openClaim(claimId: number): void {
    void this.router.navigate(['/claims', claimId]);
  }
}
