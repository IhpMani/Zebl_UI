import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, merge, throwError } from 'rxjs';
import { finalize, switchMap, takeUntil } from 'rxjs/operators';
import {
  EligibilityApiService,
  EligibilityRequestResultDto,
  EligibilityStatusDto
} from '../../../core/services/eligibility-api.service';
import { EligibilityPollingService } from '../../../core/services/eligibility-polling.service';
import { EligibilityResponsePayload } from '../../../patients/eligibility-response/eligibility-response.models';
import { PatientEligibilityRefreshService } from './patient-eligibility-refresh.service';
import { FacilityService } from '../../../core/services/facility.service';

export interface PatientEligibilityContext {
  patientId: number;
  patientName?: string | null;
  payerName?: string | null;
  memberId?: string | null;
  planName?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PatientEligibilityFlowService {
  private readonly pollStop$ = new Subject<void>();
  private readonly responseSubject = new BehaviorSubject<EligibilityResponsePayload | null>(null);
  private softTimeoutHandle: ReturnType<typeof setTimeout> | null = null;

  readonly response$ = this.responseSubject.asObservable();

  actionInProgress = false;
  pollingInProgress = false;
  error: string | null = null;

  private readonly pollIntervalMs = 1500;
  private readonly pollTimeoutMs = 30 * 60 * 1000;
  private readonly softTimeoutMs = 120_000;

  constructor(
    private readonly eligibilityApi: EligibilityApiService,
    private readonly eligibilityPolling: EligibilityPollingService,
    private readonly refreshBus: PatientEligibilityRefreshService,
    private readonly facilityService: FacilityService
  ) {}

  get response(): EligibilityResponsePayload | null {
    return this.responseSubject.value;
  }

  checkEligibility(ctx: PatientEligibilityContext, originatingScreen = 'patient-workspace-overview'): void {
    if (this.actionInProgress) return;

    this.error = null;
    this.actionInProgress = true;
    this.pollingInProgress = true;
    this.clearSoftTimeout();
    this.pollStop$.next();

    this.eligibilityApi
      .preflight(ctx.patientId)
      .pipe(
        switchMap((pf) => {
          if (!pf.valid) {
            return throwError(() => new Error((pf.errors ?? []).join('\n') || 'Eligibility preflight failed.'));
          }
          return this.eligibilityApi.request(ctx.patientId, originatingScreen);
        }),
        switchMap((request) => {
          this.saveLastRequestId(ctx.patientId, request.id);
          this.openModalForRequest(request, ctx);
          this.startSoftTimeout();
          return this.eligibilityPolling.pollWithUpdates(
            request.id,
            { intervalMs: this.pollIntervalMs, timeoutMs: this.pollTimeoutMs },
            this.pollStop$
          );
        }),
        takeUntil(this.pollStop$),
        finalize(() => {
          this.clearSoftTimeout();
          this.actionInProgress = false;
          this.pollingInProgress = false;
        })
      )
      .subscribe({
        next: (status) => this.onPollUpdate(status, ctx.patientId),
        error: (err) => {
          if (err?.message === 'ELIGIBILITY_POLL_TIMEOUT') {
            this.error = 'Still waiting for payer response. You can close and check again later.';
            this.patchModal({ pollTimedOut: true, isLoading: false });
          } else {
            const message = err?.message ?? 'Eligibility check failed.';
            this.error = message;
            if (this.response) {
              this.patchModal({ isLoading: false, errorMessage: message });
            } else {
              alert(message);
            }
          }
        }
      });
  }

  viewEligibility(patientId: number, preferredInquiryId?: number | null): void {
    const id =
      preferredInquiryId ??
      this.response?.inquiryId ??
      this.getLastRequestId(patientId);

    if (id) {
      this.eligibilityApi.getById(id, true, true).subscribe({
        next: (status) => this.presentResult(status, true),
        error: (err) => alert(err?.message || err?.error?.error || 'Failed to load eligibility response.')
      });
      return;
    }

    this.eligibilityApi.getPatientHistory(patientId).subscribe({
      next: (history) => {
        const completed = history.find((h) => h.status === 'Completed');
        const preferred = completed ?? history[0];
        if (!preferred) {
          alert('No eligibility history found for this patient.');
          return;
        }
        this.eligibilityApi.getById(preferred.inquiryId, true, true).subscribe({
          next: (status) => this.presentResult(status, true),
          error: (err) => alert(err?.message || err?.error?.error || 'Failed to load eligibility response.')
        });
      },
      error: (err) => alert(err?.message || 'Failed to load eligibility history.')
    });
  }

  closeModal(): void {
    this.pollStop$.next();
    this.clearSoftTimeout();
    this.responseSubject.next(null);
    this.pollingInProgress = false;
  }

  private onPollUpdate(status: EligibilityStatusDto, patientId: number): void {
    this.updateModalFromStatus(status);
    if (EligibilityPollingService.isTerminal(status)) {
      this.refreshBus.notify(patientId);
    }
  }

  private openModalForRequest(request: EligibilityRequestResultDto, ctx: PatientEligibilityContext): void {
    this.responseSubject.next({
      inquiryId: request.id,
      patientName: ctx.patientName ?? undefined,
      payerName: ctx.payerName ?? undefined,
      memberId: ctx.memberId ?? undefined,
      planName: ctx.planName ?? undefined,
      status: 'Checking',
      isLoading: true,
      providerNpi: request.providerNpi ?? undefined,
      providerMode: request.providerMode ?? undefined
    });
  }

  private updateModalFromStatus(status: EligibilityStatusDto): void {
    const terminal = EligibilityPollingService.isTerminal(status);
    this.responseSubject.next({
      ...this.buildPayloadFromStatus(status),
      isLoading: !terminal,
      pollTimedOut: !terminal && (this.response?.pollTimedOut ?? false)
    });
  }

  private presentResult(status: EligibilityStatusDto, openViewer: boolean): void {
    if (!openViewer) return;
    const terminal = EligibilityPollingService.isTerminal(status);
    this.responseSubject.next({
      ...this.buildPayloadFromStatus(status),
      isLoading: !terminal
    });
  }

  private buildPayloadFromStatus(status: EligibilityStatusDto): EligibilityResponsePayload {
    const lifecycle = (status.lifecycleStatus ?? status.status ?? '').trim();
    const inFlight = lifecycle && !EligibilityPollingService.isTerminal(status);
    return {
      inquiryId: status.id,
      payerName: status.payerName ?? undefined,
      planName: status.planName ?? undefined,
      planDetails: status.planDetails ?? undefined,
      memberId: status.subscriberId ?? undefined,
      status: inFlight ? 'Checking' : (status.eligibilityStatus || status.status),
      inquiryStatus: lifecycle || status.status,
      createdAt: status.createdAt,
      controlNumber: status.controlNumber,
      batchFileName: status.batchFileName ?? undefined,
      raw271: status.raw271 ?? undefined,
      raw270: status.raw270 ?? undefined,
      transportMetadataJson: status.transportMetadataJson ?? undefined,
      errorMessage: status.errorMessage ?? undefined,
      payerMessage: status.payerMessage ?? undefined,
      rejectionCode: status.rejectionCode ?? undefined,
      rejectionReason: status.rejectionReason ?? undefined,
      benefits: status.benefits ?? [],
      eligibilityStartDate: status.eligibilityStartDate ?? undefined,
      eligibilityEndDate: status.eligibilityEndDate ?? undefined,
      providerNpi: status.providerNpi ?? undefined,
      providerMode: status.providerMode ?? undefined,
      usedPayerOverride: status.usedPayerOverride
    };
  }

  private patchModal(patch: Partial<EligibilityResponsePayload>): void {
    const current = this.responseSubject.value;
    if (!current) return;
    this.responseSubject.next({ ...current, ...patch });
  }

  private startSoftTimeout(): void {
    this.clearSoftTimeout();
    this.softTimeoutHandle = setTimeout(() => {
      if (this.response?.isLoading) {
        this.patchModal({ pollTimedOut: true });
      }
    }, this.softTimeoutMs);
  }

  private clearSoftTimeout(): void {
    if (this.softTimeoutHandle != null) {
      clearTimeout(this.softTimeoutHandle);
      this.softTimeoutHandle = null;
    }
  }

  private lastRequestKey(patientId: number): string {
    return `${this.scopePrefix()}:zebl:eligibility:lastRequestId:pat:${patientId}`;
  }

  private saveLastRequestId(patientId: number, requestId: number): void {
    try {
      localStorage.setItem(this.lastRequestKey(patientId), String(requestId));
    } catch {
      /* ignore */
    }
  }

  private getLastRequestId(patientId: number): number | null {
    try {
      const raw = localStorage.getItem(this.lastRequestKey(patientId));
      const n = raw ? Number(raw) : NaN;
      return Number.isFinite(n) && n > 0 ? n : null;
    } catch {
      return null;
    }
  }

  private scopePrefix(): string {
    const tenant = this.facilityService.getTenantKeyOptional() ?? 'tenant-unknown';
    const facility = this.facilityService.getFacilityIdOptional() ?? 0;
    return `${tenant}:${facility}`;
  }
}
