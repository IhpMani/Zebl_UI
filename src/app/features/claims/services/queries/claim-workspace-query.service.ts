import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Claim } from '../../../../core/services/claim.models';
import { ClaimShellCacheService } from '../claim-shell-cache.service';
import { ClaimWorkspaceHeaderDto } from '../../models/claim-workspace-header.dto';
import { resolveClaimPatientId, resolveClaimPatientName } from '../../../../core/utils/claim-patient-id.util';
import { ClaimFinancialSummaryDto } from '../../models/claim-financial-summary.dto';
import { ClaimLifecycleStepDto } from '../../models/claim-lifecycle-step.dto';
import { ClaimServiceLineRowDto } from '../../models/claim-service-line-row.dto';
import { ClaimAdjustmentRowDto } from '../../models/claim-adjustment-row.dto';
import { ClaimPaymentRowDto } from '../../models/claim-payment-row.dto';
import { ClaimTimelineEventDto } from '../../models/claim-timeline-event.dto';
import {
  deriveClaimStatusCategory,
  deriveEdiStatus
} from '../../utils/claim-status.util';

@Injectable({ providedIn: 'root' })
export class ClaimWorkspaceQueryService {
  constructor(private readonly shellCache: ClaimShellCacheService) {}

  getHeader(claimId: number, force = false): Observable<ClaimWorkspaceHeaderDto> {
    return this.shellCache.getClaim(claimId, force).pipe(map((c) => this.toHeader(c)));
  }

  getFinancialSummary(claimId: number, force = false): Observable<ClaimFinancialSummaryDto> {
    return this.shellCache.getClaim(claimId, force).pipe(map((c) => this.toFinancial(c)));
  }

  getLifecycle(claimId: number, force = false): Observable<ClaimLifecycleStepDto[]> {
    return this.shellCache.getClaim(claimId, force).pipe(map((c) => this.toLifecycle(c)));
  }

  getServiceLines(claimId: number, force = false): Observable<ClaimServiceLineRowDto[]> {
    return this.shellCache.getClaim(claimId, force).pipe(map((c) => this.toServiceLines(c)));
  }

  getAdjustments(claimId: number, force = false): Observable<ClaimAdjustmentRowDto[]> {
    return this.shellCache.getClaim(claimId, force).pipe(map((c) => this.flattenAdjustments(c)));
  }

  getPayments(claimId: number, force = false): Observable<ClaimPaymentRowDto[]> {
    return this.shellCache.getClaim(claimId, force).pipe(map((c) => this.flattenPayments(c)));
  }

  getTimeline(claimId: number, force = false): Observable<ClaimTimelineEventDto[]> {
    return this.shellCache.getClaim(claimId, force).pipe(map((c) => this.toTimeline(c)));
  }

  getEraSummary(claimId: number, force = false): Observable<{ ediStatus: string; notes: string | null; submissionMethod: string | null }> {
    return this.shellCache.getClaim(claimId, force).pipe(
      map((c) => ({
        ediStatus: deriveEdiStatus(c),
        notes: c.claEDINotes,
        submissionMethod: c.claSubmissionMethod
      }))
    );
  }

  invalidate(claimId: number): void {
    this.shellCache.invalidate(claimId);
  }

  private toHeader(c: Claim): ClaimWorkspaceHeaderDto {
    const lastAct = c.claimActivity?.[0];
    return {
      claimId: c.claID,
      patientId: resolveClaimPatientId(c),
      patientName: resolveClaimPatientName(c) ?? c.patient?.patFullNameCC ?? null,
      accountNo: c.patient?.patAccountNo ?? null,
      dos: c.claFirstDateTRIG ?? c.claLastDateTRIG,
      primaryPayer: c.primaryPayerName ?? null,
      status: c.claStatus,
      statusCategory: deriveClaimStatusCategory(c.claStatus),
      claimType: c.claClassification,
      totalCharges: c.claTotalChargeTRIG,
      insuranceBalance: this.insBalance(c),
      patientBalance: this.patBalance(c),
      totalBalance: c.claTotalBalanceCC,
      lastActivity: lastAct?.date ?? c.claDateTimeModified,
      lastEdiEvent: deriveEdiStatus(c),
      agingDays: this.calcAgingDays(c.claBillDate ?? c.claFirstDateTRIG)
    };
  }

  private toFinancial(c: Claim): ClaimFinancialSummaryDto {
    const insPaid = (c.serviceLines ?? []).reduce((s, l) => s + Number(l.srvTotalInsAmtPaidTRIG ?? 0), 0);
    const patPaid = (c.serviceLines ?? []).reduce((s, l) => s + Number(l.srvTotalPatAmtPaidTRIG ?? 0), 0);
    const adj = (c.serviceLines ?? []).reduce((s, l) => s + Number(l.srvTotalAdjCC ?? 0), 0);
    const charges = Number(c.claTotalChargeTRIG ?? 0);
    const applied = Number(c.claTotalAmtAppliedCC ?? 0);
    const insBal = this.insBalance(c);
    const patBal = this.patBalance(c);
    return {
      totalCharges: charges,
      insurancePaid: insPaid,
      patientPaid: patPaid,
      adjustments: adj,
      writeOffs: 0,
      remainingInsurance: insBal,
      remainingPatient: patBal,
      totalApplied: applied,
      undistributedPayments: Math.max(0, insPaid + patPaid - applied),
      totalBalance: Number(c.claTotalBalanceCC ?? 0)
    };
  }

  private toLifecycle(c: Claim): ClaimLifecycleStepDto[] {
    const status = deriveClaimStatusCategory(c.claStatus);
    const patResp: ClaimLifecycleStepDto['state'] =
      Number(c.claTotalBalanceCC ?? 0) > 0 ? 'current' : 'complete';
    const steps: Array<{ id: string; label: string; gate: ClaimLifecycleStepDto['state'] }> = [
      { id: 'created', label: 'Created', gate: 'complete' },
      { id: 'scrubbed', label: 'Scrubbed', gate: status === 'draft' ? 'pending' : 'complete' },
      { id: 'submitted', label: 'Submitted', gate: this.gate(status, ['submitted', 'rts', 'pending', 'denied', 'paid', 'partial', 'secondary', 'closed']) },
      { id: 'accepted', label: 'Accepted', gate: this.gate(status, ['pending', 'paid', 'partial', 'secondary', 'closed']) },
      { id: 'era', label: 'ERA Received', gate: (c.claEDINotes ?? '').trim() ? 'complete' : 'pending' },
      { id: 'adjusted', label: 'Adjusted', gate: this.hasAdjustments(c) ? 'complete' : 'pending' },
      { id: 'paid', label: 'Paid', gate: this.gate(status, ['paid', 'closed', 'partial']) },
      { id: 'patient', label: 'Patient Responsibility', gate: patResp },
      { id: 'closed', label: 'Closed', gate: status === 'closed' ? 'complete' : 'pending' }
    ];
    return steps.map((s) => ({
      id: s.id,
      label: s.label,
      state: s.gate,
      at: s.id === 'created' ? c.claDateTimeCreated : null
    }));
  }

  private gate(status: ReturnType<typeof deriveClaimStatusCategory>, allowed: ReturnType<typeof deriveClaimStatusCategory>[]): ClaimLifecycleStepDto['state'] {
    if (allowed.includes(status)) return 'complete';
    if (status === 'rts' || status === 'denied') return 'error';
    return 'pending';
  }

  private hasAdjustments(c: Claim): boolean {
    return (c.serviceLines ?? []).some((l) => (l.adjustments?.length ?? 0) > 0);
  }

  private toServiceLines(c: Claim): ClaimServiceLineRowDto[] {
    return (c.serviceLines ?? []).map((l) => ({
      serviceLineId: l.srvID,
      dos: l.srvFromDate ?? l.srvToDate,
      procedureCode: l.srvProcedureCode,
      modifiers: l.srvDiagnosisPointer,
      units: l.srvUnits,
      charges: l.srvCharges,
      allowed: null,
      insurancePaid: l.srvTotalInsAmtPaidTRIG ?? null,
      patientPaid: l.srvTotalPatAmtPaidTRIG ?? null,
      adjustments: l.srvTotalAdjCC ?? null,
      remainingBalance: l.srvTotalBalanceCC ?? null,
      responsibleParty: l.responsiblePartyName,
      agingDays: this.calcAgingDays(l.srvFromDate),
      hasDenial: (l.adjustments ?? []).some((a) => (a.adjReasonCode ?? '').toUpperCase().startsWith('CO')),
      adjustmentCount: l.adjustments?.length ?? 0,
      paymentCount: l.payments?.length ?? 0
    }));
  }

  private flattenAdjustments(c: Claim): ClaimAdjustmentRowDto[] {
    const rows: ClaimAdjustmentRowDto[] = [];
    for (const l of c.serviceLines ?? []) {
      for (const a of l.adjustments ?? []) {
        rows.push({
          adjustmentId: a.adjID,
          serviceLineId: l.srvID,
          groupCode: a.adjGroupCode,
          reasonCode: a.adjReasonCode,
          remarkCode: null,
          amount: a.adjAmount,
          payer: a.payerName,
          eraRef: null,
          date: a.adjDate ?? a.adjDateTimeCreated
        });
      }
    }
    return rows;
  }

  private flattenPayments(c: Claim): ClaimPaymentRowDto[] {
    const rows: ClaimPaymentRowDto[] = [];
    for (const l of c.serviceLines ?? []) {
      for (const p of l.payments ?? []) {
        rows.push({
          paymentId: p.pmtID,
          serviceLineId: l.srvID,
          paymentDate: p.pmtDate,
          amount: p.pmtAmount,
          method: p.pmtMethod,
          eraRef: p.pmt835Ref,
          unappliedAmount: null
        });
      }
    }
    return rows;
  }

  private toTimeline(c: Claim): ClaimTimelineEventDto[] {
    const events: ClaimTimelineEventDto[] = (c.claimActivity ?? []).map((a, i) => ({
      id: `act-${i}`,
      at: a.date,
      label: a.activityType,
      detail: a.notes,
      tone: a.activityType.toLowerCase().includes('payment')
        ? 'payment'
        : a.activityType.toLowerCase().includes('edi') || a.activityType.toLowerCase().includes('era')
          ? 'era'
          : 'info'
    }));
    if (c.claDateTimeModified) {
      events.push({
        id: 'mod',
        at: c.claDateTimeModified,
        label: 'Claim modified',
        detail: c.claLastUserName ?? null,
        tone: 'edit'
      });
    }
    return events.sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  }

  private insBalance(c: Claim): number {
    const lines = c.serviceLines ?? [];
    if (lines.length) {
      return lines.reduce((s, l) => s + Number(l.srvTotalBalanceCC ?? 0), 0) * 0.5;
    }
    return Number(c.claTotalBalanceCC ?? 0) * 0.5;
  }

  private patBalance(c: Claim): number {
    return Number(c.claTotalBalanceCC ?? 0) - this.insBalance(c);
  }

  private calcAgingDays(dateStr: string | null | undefined): number | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  }
}
