import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs';
import { PatientWorkspaceHeaderDto } from '../models/patient-workspace-header.dto';
import { PatientFinancialSummaryDto } from '../models/patient-financial-summary.dto';
import { PatientRecentClaimDto } from '../models/patient-recent-claim.dto';
import { PatientRecentPaymentDto } from '../models/patient-recent-payment.dto';
import { PatientInsuranceSummaryDto } from '../models/patient-insurance-summary.dto';
import { PatientAgingSummaryDto } from '../models/patient-aging-summary.dto';
import { PatientClaimRowDto } from '../models/patient-claim-row.dto';
import { PatientPaymentRowDto } from '../models/patient-payment-row.dto';
import {
  DEFAULT_PATIENT_WORKSPACE_TAB,
  PatientWorkspaceTabId,
  PATIENT_WORKSPACE_TABS
} from '../models/patient-workspace-tab-id';
import { idleSlice, LoadStatus, SliceLoadState, WorkspaceSliceKey } from '../models/workspace-load-state.model';
import { PatientWorkspaceQueryService } from './queries/patient-workspace-query.service';
import { PatientClaimsQueryService } from './queries/patient-claims-query.service';
import { PatientPaymentsQueryService } from './queries/patient-payments-query.service';
import { PatientWorkspacePersistenceService } from './patient-workspace-persistence.service';
import { RibbonContextService } from '../../../core/services/ribbon-context.service';

export interface PatientWorkspaceContext {
  patId: number | null;
  activeTabId: PatientWorkspaceTabId;
  selectedClaimId: number | null;
  selectedPaymentId: number | null;
  dirty: boolean;
}

export interface ClaimsTabPageState {
  page: number;
  pageSize: number;
  totalCount: number;
}

interface TabDataCache {
  claims?: PatientClaimRowDto[];
  payments?: PatientPaymentRowDto[];
}

const CLAIMS_PAGE_SIZE = 50;
const OVERVIEW_WIDGET_SLICES: WorkspaceSliceKey[] = [
  'financial',
  'claimsPreview',
  'insuranceSummary',
  'recentPayments',
  'aging'
];

@Injectable({ providedIn: 'root' })
export class PatientWorkspaceStateService implements OnDestroy {
  private readonly contextSubject = new BehaviorSubject<PatientWorkspaceContext>({
    patId: null,
    activeTabId: DEFAULT_PATIENT_WORKSPACE_TAB,
    selectedClaimId: null,
    selectedPaymentId: null,
    dirty: false
  });

  private readonly headerSubject = new BehaviorSubject<PatientWorkspaceHeaderDto | null>(null);
  private readonly financialSubject = new BehaviorSubject<PatientFinancialSummaryDto | null>(null);
  private readonly claimsPreviewSubject = new BehaviorSubject<PatientRecentClaimDto[]>([]);
  private readonly insuranceSummarySubject = new BehaviorSubject<PatientInsuranceSummaryDto | null>(null);
  private readonly recentPaymentsSubject = new BehaviorSubject<PatientRecentPaymentDto[]>([]);
  private readonly agingSubject = new BehaviorSubject<PatientAgingSummaryDto | null>(null);
  private readonly claimsPageSubject = new BehaviorSubject<ClaimsTabPageState>({
    page: 1,
    pageSize: CLAIMS_PAGE_SIZE,
    totalCount: 0
  });

  private readonly sliceState = new Map<WorkspaceSliceKey, BehaviorSubject<SliceLoadState>>();
  private readonly tabLoaded = new Set<PatientWorkspaceTabId>();
  private readonly tabCache: TabDataCache = {};
  private readonly refreshSubject = new Subject<void>();
  private readonly claimsTabRowsSubject = new BehaviorSubject<PatientClaimRowDto[]>([]);
  private readonly paymentsTabRowsSubject = new BehaviorSubject<PatientPaymentRowDto[]>([]);
  private loadGeneration = 0;
  private subs: Subscription[] = [];

  readonly context$ = this.contextSubject.asObservable();
  readonly header$ = this.headerSubject.asObservable();
  readonly financial$ = this.financialSubject.asObservable();
  readonly claimsPreview$ = this.claimsPreviewSubject.asObservable();
  readonly insuranceSummary$ = this.insuranceSummarySubject.asObservable();
  readonly recentPayments$ = this.recentPaymentsSubject.asObservable();
  readonly aging$ = this.agingSubject.asObservable();
  readonly claimsPage$ = this.claimsPageSubject.asObservable();
  readonly claimsTabRows$ = this.claimsTabRowsSubject.asObservable();
  readonly paymentsTabRows$ = this.paymentsTabRowsSubject.asObservable();
  readonly refresh$ = this.refreshSubject.asObservable();

  constructor(
    private readonly workspaceQuery: PatientWorkspaceQueryService,
    private readonly claimsQuery: PatientClaimsQueryService,
    private readonly paymentsQuery: PatientPaymentsQueryService,
    private readonly persistence: PatientWorkspacePersistenceService,
    private readonly ribbonContext: RibbonContextService
  ) {
    for (const key of this.allSliceKeys()) {
      this.sliceState.set(key, new BehaviorSubject<SliceLoadState>(idleSlice()));
    }
  }

  ngOnDestroy(): void {
    this.cancelAllLoads();
  }

  /** @deprecated Prefer claimsTabRows$ with OnPush tabs */
  getCachedClaims(): PatientClaimRowDto[] {
    return this.tabCache.claims ?? [];
  }

  get context(): PatientWorkspaceContext {
    return this.contextSubject.value;
  }

  getHeaderSnapshot(): PatientWorkspaceHeaderDto | null {
    return this.headerSubject.value;
  }

  slice$(key: WorkspaceSliceKey): Observable<SliceLoadState> {
    return this.sliceState.get(key)!.asObservable();
  }

  getSlice(key: WorkspaceSliceKey): SliceLoadState {
    return this.sliceState.get(key)!.value;
  }

  /**
   * Step 1: header only (fast paint).
   * Step 2: overview widgets in parallel (partial failure safe).
   * Step 3: tab content on demand.
   */
  openPatient(patId: number, options?: { force?: boolean }): void {
    const force = options?.force ?? false;
    if (!force && this.context.patId === patId && this.getSlice('header').status === 'loaded') {
      return;
    }

    this.cancelAllLoads();
    const gen = ++this.loadGeneration;
    this.reset(patId);
    this.loadHeader(patId, gen, force);
    this.loadOverviewWidgets(patId, gen, force);
  }

  setActiveTab(tabId: PatientWorkspaceTabId): void {
    const ctx = this.contextSubject.value;
    if (ctx.activeTabId === tabId) return;
    this.contextSubject.next({ ...ctx, activeTabId: tabId });
    if (ctx.patId) {
      this.persistence.saveLastTab(ctx.patId, tabId);
    }
    this.ensureTabLoaded(tabId);
  }

  selectClaim(claimId: number | null): void {
    const ctx = this.contextSubject.value;
    this.contextSubject.next({ ...ctx, selectedClaimId: claimId });
    if (ctx.patId) {
      this.ribbonContext.setContext({ patientId: ctx.patId, claimId });
    }
  }

  selectPayment(paymentId: number | null): void {
    this.contextSubject.next({ ...this.contextSubject.value, selectedPaymentId: paymentId });
  }

  markDirty(dirty = true): void {
    this.contextSubject.next({ ...this.contextSubject.value, dirty });
  }

  refresh(): void {
    const patId = this.context.patId;
    if (!patId) return;
    this.workspaceQuery.invalidatePatient(patId);
    this.tabLoaded.clear();
    this.tabCache.claims = undefined;
    this.tabCache.payments = undefined;
    this.openPatient(patId, { force: true });
    const tab = this.context.activeTabId;
    if (tab !== 'overview') {
      this.ensureTabLoaded(tab, true);
    }
    this.refreshSubject.next();
  }

  getCachedPayments(): PatientPaymentRowDto[] {
    return this.tabCache.payments ?? [];
  }

  getClaimsPageState(): ClaimsTabPageState {
    return this.claimsPageSubject.value;
  }

  loadClaimsPage(page: number): void {
    const patId = this.context.patId;
    if (!patId) return;
    this.loadClaimsTab(patId, true, page);
  }

  reloadPaymentsTab(): void {
    const patId = this.context.patId;
    if (!patId) return;
    this.tabLoaded.delete('payments');
    this.tabCache.payments = undefined;
    this.loadPaymentsTab(patId, true);
  }

  isTabLoaded(tabId: PatientWorkspaceTabId): boolean {
    return this.tabLoaded.has(tabId);
  }

  shouldLazyLoad(tabId: PatientWorkspaceTabId): boolean {
    return PATIENT_WORKSPACE_TABS.find((t) => t.id === tabId)?.lazy ?? true;
  }

  private loadHeader(patId: number, gen: number, force: boolean): void {
    this.setSlice('header', 'loading');
    const sub = this.workspaceQuery.getHeaderSummary(patId, force).subscribe({
      next: (header) => {
        if (gen !== this.loadGeneration) return;
        this.headerSubject.next(header);
        this.setSlice('header', 'loaded');
        this.persistence.pushRecentPatient(patId, header.patientName);
      },
      error: (err) => {
        if (gen !== this.loadGeneration) return;
        this.setSlice('header', 'error', this.errorMessage(err));
      }
    });
    this.subs.push(sub);
  }

  private loadOverviewWidgets(patId: number, gen: number, force: boolean): void {
    this.setSlice('overview', 'loading');
    for (const key of OVERVIEW_WIDGET_SLICES) {
      this.setSlice(key, 'loading');
    }

    this.loadOverviewSlice(
      'financial',
      gen,
      this.workspaceQuery.getFinancialSummary(patId, force),
      (v) => this.financialSubject.next(v)
    );
    this.loadOverviewSlice(
      'claimsPreview',
      gen,
      this.workspaceQuery.getRecentClaims(patId, 8),
      (v) => this.claimsPreviewSubject.next(v)
    );
    this.loadOverviewSlice(
      'insuranceSummary',
      gen,
      this.workspaceQuery.getInsuranceSummary(patId, force),
      (v) => this.insuranceSummarySubject.next(v)
    );
    this.loadOverviewSlice(
      'recentPayments',
      gen,
      this.workspaceQuery.getRecentPayments(patId, 5),
      (v) => this.recentPaymentsSubject.next(v)
    );
    this.loadOverviewSlice(
      'aging',
      gen,
      this.workspaceQuery.getAgingSummary(patId),
      (v) => this.agingSubject.next(v)
    );
  }

  private loadOverviewSlice<T>(
    key: WorkspaceSliceKey,
    gen: number,
    source$: Observable<T>,
    onData: (value: T) => void
  ): void {
    const sub = source$.subscribe({
      next: (value) => {
        if (gen !== this.loadGeneration) return;
        onData(value);
        this.setSlice(key, 'loaded');
        this.syncOverviewSlice();
      },
      error: (err) => {
        if (gen !== this.loadGeneration) return;
        this.setSlice(key, 'error', this.errorMessage(err));
        this.syncOverviewSlice();
      }
    });
    this.subs.push(sub);
  }

  private syncOverviewSlice(): void {
    const pending = OVERVIEW_WIDGET_SLICES.some((k) => this.getSlice(k).status === 'loading');
    if (pending) return;

    const anyLoaded = OVERVIEW_WIDGET_SLICES.some((k) => this.getSlice(k).status === 'loaded');
    if (anyLoaded) {
      this.setSlice('overview', 'loaded');
      this.tabLoaded.add('overview');
    } else {
      this.setSlice('overview', 'error', 'Overview widgets failed to load');
    }
  }

  private ensureTabLoaded(tabId: PatientWorkspaceTabId, force = false): void {
    const patId = this.context.patId;
    if (!patId) return;
    if (!force && this.tabLoaded.has(tabId)) return;

    switch (tabId) {
      case 'overview':
        if (this.getSlice('overview').status === 'idle') {
          this.loadOverviewWidgets(patId, this.loadGeneration, false);
        }
        break;
      case 'claims':
        this.loadClaimsTab(patId, force, this.claimsPageSubject.value.page);
        break;
      case 'payments':
        this.loadPaymentsTab(patId, force);
        break;
      default:
        this.setSlice(tabId as WorkspaceSliceKey, 'loaded');
        this.tabLoaded.add(tabId);
        break;
    }
  }

  private loadClaimsTab(patId: number, force: boolean, page: number): void {
    if (!force && this.tabCache.claims && page === this.claimsPageSubject.value.page) {
      this.setSlice('claims', 'loaded');
      this.tabLoaded.add('claims');
      return;
    }

    this.setSlice('claims', 'loading');
    const pageSize = CLAIMS_PAGE_SIZE;
    const sub = this.claimsQuery.getClaimRows(patId, page, pageSize).subscribe({
      next: (res) => {
        if (patId !== this.context.patId) return;
        this.tabCache.claims = res.rows;
        this.claimsTabRowsSubject.next(res.rows);
        this.claimsPageSubject.next({
          page: res.page,
          pageSize: res.pageSize,
          totalCount: res.totalCount
        });
        this.setSlice('claims', 'loaded');
        this.tabLoaded.add('claims');
      },
      error: (err) => {
        this.setSlice('claims', 'error', this.errorMessage(err));
      }
    });
    this.subs.push(sub);
  }

  private loadPaymentsTab(patId: number, force: boolean): void {
    if (!force && this.tabCache.payments) {
      this.setSlice('payments', 'loaded');
      this.tabLoaded.add('payments');
      return;
    }

    this.setSlice('payments', 'loading');
    const sub = this.paymentsQuery.getPaymentRows(patId, 1, 50).subscribe({
      next: (res) => {
        if (patId !== this.context.patId) return;
        this.tabCache.payments = res.rows;
        this.paymentsTabRowsSubject.next(res.rows);
        this.setSlice('payments', 'loaded');
        this.tabLoaded.add('payments');
      },
      error: (err) => {
        this.setSlice('payments', 'error', this.errorMessage(err));
      }
    });
    this.subs.push(sub);
  }

  private reset(patId: number): void {
    this.tabLoaded.clear();
    this.tabCache.claims = undefined;
    this.tabCache.payments = undefined;
    this.headerSubject.next(null);
    this.financialSubject.next(null);
    this.claimsPreviewSubject.next([]);
    this.insuranceSummarySubject.next(null);
    this.recentPaymentsSubject.next([]);
    this.agingSubject.next(null);
    this.claimsPageSubject.next({ page: 1, pageSize: CLAIMS_PAGE_SIZE, totalCount: 0 });
    this.claimsTabRowsSubject.next([]);
    this.paymentsTabRowsSubject.next([]);

    for (const key of this.allSliceKeys()) {
      this.setSlice(key, 'idle');
    }

    this.contextSubject.next({
      patId,
      activeTabId: DEFAULT_PATIENT_WORKSPACE_TAB,
      selectedClaimId: null,
      selectedPaymentId: null,
      dirty: false
    });
  }

  private cancelAllLoads(): void {
    for (const s of this.subs) {
      s.unsubscribe();
    }
    this.subs = [];
  }

  private setSlice(key: WorkspaceSliceKey, status: LoadStatus, error: string | null = null): void {
    const subj = this.sliceState.get(key)!;
    subj.next({
      status,
      error,
      loadedAt: status === 'loaded' ? Date.now() : null
    });
  }

  private errorMessage(err: unknown): string {
    const e = err as { error?: { error?: string }; message?: string };
    return e?.error?.error ?? e?.message ?? 'Request failed';
  }

  private allSliceKeys(): WorkspaceSliceKey[] {
    return [
      'header',
      'financial',
      'claimsPreview',
      'insuranceSummary',
      'recentPayments',
      'aging',
      'overview',
      'claims',
      'payments',
      'insurance',
      'statements',
      'era',
      'documents',
      'notes',
      'tasks',
      'audit'
    ];
  }
}
