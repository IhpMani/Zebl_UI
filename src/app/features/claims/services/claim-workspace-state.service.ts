import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { ClaimWorkspaceHeaderDto } from '../models/claim-workspace-header.dto';
import { ClaimFinancialSummaryDto } from '../models/claim-financial-summary.dto';
import { ClaimLifecycleStepDto } from '../models/claim-lifecycle-step.dto';
import { ClaimServiceLineRowDto } from '../models/claim-service-line-row.dto';
import { ClaimAdjustmentRowDto } from '../models/claim-adjustment-row.dto';
import { ClaimPaymentRowDto } from '../models/claim-payment-row.dto';
import { ClaimTimelineEventDto } from '../models/claim-timeline-event.dto';
import {
  ClaimWorkspaceSliceKey,
  idleSlice,
  LoadStatus,
  SliceLoadState
} from '../models/claim-workspace-load-state.model';
import { ClaimWorkspaceQueryService } from './queries/claim-workspace-query.service';

@Injectable({ providedIn: 'root' })
export class ClaimWorkspaceStateService implements OnDestroy {
  private readonly headerSubject = new BehaviorSubject<ClaimWorkspaceHeaderDto | null>(null);
  private readonly financialSubject = new BehaviorSubject<ClaimFinancialSummaryDto | null>(null);
  private readonly lifecycleSubject = new BehaviorSubject<ClaimLifecycleStepDto[]>([]);
  private readonly serviceLinesSubject = new BehaviorSubject<ClaimServiceLineRowDto[]>([]);
  private readonly adjustmentsSubject = new BehaviorSubject<ClaimAdjustmentRowDto[]>([]);
  private readonly paymentsSubject = new BehaviorSubject<ClaimPaymentRowDto[]>([]);
  private readonly timelineSubject = new BehaviorSubject<ClaimTimelineEventDto[]>([]);
  private readonly eraSubject = new BehaviorSubject<{ ediStatus: string; notes: string | null; submissionMethod: string | null } | null>(null);
  private readonly sliceState = new Map<ClaimWorkspaceSliceKey, BehaviorSubject<SliceLoadState>>();
  private readonly expandedLineSubject = new BehaviorSubject<number | null>(null);

  private loadGeneration = 0;
  private subs: Subscription[] = [];
  private claimId: number | null = null;
  private serviceLinesLoaded = false;

  readonly header$ = this.headerSubject.asObservable();
  readonly financial$ = this.financialSubject.asObservable();
  readonly lifecycle$ = this.lifecycleSubject.asObservable();
  readonly serviceLines$ = this.serviceLinesSubject.asObservable();
  readonly adjustments$ = this.adjustmentsSubject.asObservable();
  readonly payments$ = this.paymentsSubject.asObservable();
  readonly timeline$ = this.timelineSubject.asObservable();
  readonly era$ = this.eraSubject.asObservable();
  readonly expandedServiceLineId$ = this.expandedLineSubject.asObservable();

  constructor(private readonly query: ClaimWorkspaceQueryService) {
    for (const key of this.allSliceKeys()) {
      this.sliceState.set(key, new BehaviorSubject<SliceLoadState>(idleSlice()));
    }
  }

  ngOnDestroy(): void {
    this.cancelLoads();
  }

  slice$(key: ClaimWorkspaceSliceKey): Observable<SliceLoadState> {
    return this.sliceState.get(key)!.asObservable();
  }

  openClaim(claimId: number, force = false): void {
    if (!force && this.claimId === claimId && this.getSlice('header').status === 'loaded') {
      return;
    }
    this.cancelLoads();
    this.claimId = claimId;
    this.serviceLinesLoaded = false;
    this.resetSubjects();
    const gen = ++this.loadGeneration;

    this.loadSlice('header', gen, this.query.getHeader(claimId, force), (v) => this.headerSubject.next(v));
    this.loadSlice('financial', gen, this.query.getFinancialSummary(claimId, force), (v) => this.financialSubject.next(v));
    this.loadSlice('lifecycle', gen, this.query.getLifecycle(claimId, force), (v) => this.lifecycleSubject.next(v));
    this.loadSlice('timeline', gen, this.query.getTimeline(claimId, force), (v) => this.timelineSubject.next(v));
    this.loadSlice('era', gen, this.query.getEraSummary(claimId, force), (v) => this.eraSubject.next(v));
  }

  ensureFinancialPanelsLoaded(): void {
    const id = this.claimId;
    if (!id || this.serviceLinesLoaded) return;
    this.serviceLinesLoaded = true;
    const gen = this.loadGeneration;
    this.loadSlice('serviceLines', gen, this.query.getServiceLines(id), (v) => this.serviceLinesSubject.next(v));
    this.loadSlice('adjustments', gen, this.query.getAdjustments(id), (v) => this.adjustmentsSubject.next(v));
    this.loadSlice('payments', gen, this.query.getPayments(id), (v) => this.paymentsSubject.next(v));
  }

  toggleServiceLineExpand(serviceLineId: number): void {
    const cur = this.expandedLineSubject.value;
    this.expandedLineSubject.next(cur === serviceLineId ? null : serviceLineId);
  }

  refresh(): void {
    const id = this.claimId;
    if (!id) return;
    this.query.invalidate(id);
    this.openClaim(id, true);
    this.serviceLinesLoaded = false;
    this.ensureFinancialPanelsLoaded();
  }

  private loadSlice<T>(
    key: ClaimWorkspaceSliceKey,
    gen: number,
    source$: Observable<T>,
    onData: (v: T) => void
  ): void {
    this.setSlice(key, 'loading');
    const sub = source$.subscribe({
      next: (v) => {
        if (gen !== this.loadGeneration) return;
        onData(v);
        this.setSlice(key, 'loaded');
      },
      error: (err) => {
        if (gen !== this.loadGeneration) return;
        this.setSlice(key, 'error', this.errMsg(err));
      }
    });
    this.subs.push(sub);
  }

  private resetSubjects(): void {
    this.headerSubject.next(null);
    this.financialSubject.next(null);
    this.lifecycleSubject.next([]);
    this.serviceLinesSubject.next([]);
    this.adjustmentsSubject.next([]);
    this.paymentsSubject.next([]);
    this.timelineSubject.next([]);
    this.eraSubject.next(null);
    this.expandedLineSubject.next(null);
    for (const k of this.allSliceKeys()) {
      this.setSlice(k, 'idle');
    }
  }

  private cancelLoads(): void {
    for (const s of this.subs) s.unsubscribe();
    this.subs = [];
  }

  private setSlice(key: ClaimWorkspaceSliceKey, status: LoadStatus, error: string | null = null): void {
    this.sliceState.get(key)!.next({
      status,
      error,
      loadedAt: status === 'loaded' ? Date.now() : null
    });
  }

  private getSlice(key: ClaimWorkspaceSliceKey): SliceLoadState {
    return this.sliceState.get(key)!.value;
  }

  private errMsg(err: unknown): string {
    const e = err as { error?: { error?: string }; message?: string };
    return e?.error?.error ?? e?.message ?? 'Request failed';
  }

  private allSliceKeys(): ClaimWorkspaceSliceKey[] {
    return ['header', 'financial', 'lifecycle', 'serviceLines', 'adjustments', 'payments', 'era', 'timeline'];
  }
}
