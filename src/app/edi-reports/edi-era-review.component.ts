import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  EdiReportsApiService,
  Era835AuditTrailEntryDto,
  Era835CasDispositionDto,
  Era835PostingHistoryEntryDto,
  Era835ReviewApplyRequestDto,
  Era835ReviewCasDto,
  Era835ReviewCasTotalsDto,
  Era835ReviewClaimContextDto,
  Era835ReviewDisbursementLineDto,
  Era835ReviewLineRowDto,
  Era835ReviewResponseDto
} from '../core/services/edi-reports-api.service';
import { Era835ReviewReturnCacheService } from '../core/services/era835-review-return-cache.service';
import { WorkspaceService } from '../workspace/application/workspace.service';
import { Era835ReviewUiSnapshot } from './edi-era-review-ui.snapshot';

export type AdjDisposition = 'apply' | 'track' | 'ignore';

type CreditDisposition = 'Hold' | 'ApplyImmediately';

interface CreditDispositionState {
  insurance: CreditDisposition;
  patient: CreditDisposition;
}

export interface DisbursementRowState {
  apply: boolean;
  amount: number;
}

export interface ClaimWorkstation {
  claimExternalId: string;
  primaryLine: Era835ReviewLineRowDto;
  lines: Era835ReviewLineRowDto[];
  context?: Era835ReviewClaimContextDto;
}

@Component({
  selector: 'app-edi-era-review',
  templateUrl: './edi-era-review.component.html',
  styleUrls: ['./edi-era-review.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EdiEraReviewComponent implements OnInit {
  @ViewChild('tableScroll') tableScroll?: ElementRef<HTMLElement>;
  reportId = '';
  loading = false;
  applying = false;
  reversing = false;
  error: string | null = null;
  info: string | null = null;
  data: Era835ReviewResponseDto | null = null;
  selectedLine: Era835ReviewLineRowDto | null = null;
  expandedClaimIds: string[] = [];
  expandedServiceLineKeys: string[] = [];
  adjustmentIgnored = new Map<string, boolean>();
  adjDisposition = new Map<string, AdjDisposition>();
  disbursementState = new Map<string, DisbursementRowState>();
  creditDisposition = new Map<string, CreditDispositionState>();
  manualMatchDraft = new Map<string, { claimId: string; notes: string }>();
  manualMatching = false;
  claimWorkstations: ClaimWorkstation[] = [];
  auditTrail: Era835AuditTrailEntryDto[] = [];
  postingHistory: Era835PostingHistoryEntryDto[] = [];
  auditPanelOpen = false;
  historyPanelOpen = false;
  shortcutsOpen = false;
  auditLoading = false;
  historyLoading = false;
  readonly pageSizeOptions = [50, 100, 250, 500];

  page = 1;
  pageSize = 100;
  filterUnmatched = false;
  filterApplied = false;
  filterDuplicates = false;
  filterReversals = false;
  filterPayer = '';
  filterPatient = '';
  filterClaimId = '';
  filterCpt = '';
  filterDos = '';
  filterAdj = '';
  rawEdiOpen = false;
  rawEdiText: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ediApi: EdiReportsApiService,
    private workspace: WorkspaceService,
    private returnCache: Era835ReviewReturnCacheService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.reportId = this.route.snapshot.paramMap.get('id') || '';
    this.workspace.updateActiveTabTitle('ERA Payment Review');
    const uiSnap = this.readUiSnapshot();
    const cached = this.returnCache.consumePayload(this.reportId);
    if (uiSnap) this.applyUiSnapshot(uiSnap);
    if (cached) {
      this.data = cached;
      this.rebuildWorkstations();
      this.initDisbursementFromReview();
      this.loading = false;
      this.error = null;
      const name = cached.report?.fileName || 'ERA';
      this.workspace.updateActiveTabTitle(`ERA — ${name}`);
      this.queueRestoreScroll(uiSnap?.scrollTop ?? 0);
      this.cdr.markForCheck();
      return;
    }
    this.loadReview(false);
  }

  private rebuildWorkstations(): void {
    const lines = this.data?.lines ?? [];
    const contexts = this.data?.claimContexts ?? [];
    const ctxByClaim = new Map(contexts.map((c) => [c.claimExternalId, c]));
    const byClaim = new Map<string, Era835ReviewLineRowDto[]>();
    for (const line of lines) {
      const key = line.claimExternalId;
      const bucket = byClaim.get(key) ?? [];
      bucket.push(line);
      byClaim.set(key, bucket);
    }
    this.claimWorkstations = Array.from(byClaim.entries()).map(([claimExternalId, claimLines]) => {
      const sorted = [...claimLines].sort((a, b) => a.lineIndexInClaim - b.lineIndexInClaim);
      return {
        claimExternalId,
        primaryLine: sorted[0],
        lines: sorted,
        context: ctxByClaim.get(claimExternalId)
      };
    });
  }

  trackByClaim(_index: number, ws: ClaimWorkstation): string {
    return ws.claimExternalId;
  }

  isDuplicateRow(row: Era835ReviewLineRowDto): boolean {
    return row.status === 'Duplicate';
  }

  hasReconciliationWarnings(): boolean {
    return (this.data?.reconciliation?.warnings?.length ?? 0) > 0;
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(ev: KeyboardEvent): void {
    if (this.isTypingInField(ev.target)) return;
    const key = ev.key.toLowerCase();
    if (key === '?' && !ev.ctrlKey && !ev.metaKey) {
      ev.preventDefault();
      this.shortcutsOpen = !this.shortcutsOpen;
      this.cdr.markForCheck();
      return;
    }
    if (ev.altKey && key === 'a') {
      ev.preventDefault();
      this.bulkAdjDisposition('apply');
      return;
    }
    if (ev.altKey && key === 'i') {
      ev.preventDefault();
      this.bulkAdjDisposition('ignore');
      return;
    }
    if (ev.altKey && key === 't') {
      ev.preventDefault();
      this.bulkAdjDisposition('track');
      return;
    }
    if (key === 'e' && !ev.ctrlKey) {
      ev.preventDefault();
      this.expandAllClaims();
      return;
    }
    if (key === 'c' && !ev.ctrlKey) {
      ev.preventDefault();
      this.collapseAllClaims();
      return;
    }
    if (key === '[') {
      ev.preventDefault();
      this.prevPage();
      return;
    }
    if (key === ']') {
      ev.preventDefault();
      this.nextPage();
    }
  }

  private isTypingInField(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el) return false;
    const tag = el.tagName?.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
  }

  expandAllClaims(): void {
    this.expandedClaimIds = this.claimWorkstations.map((w) => w.claimExternalId);
    this.cdr.markForCheck();
  }

  collapseAllClaims(): void {
    this.expandedClaimIds = [];
    this.expandedServiceLineKeys = [];
    this.cdr.markForCheck();
  }

  bulkAdjDisposition(value: AdjDisposition): void {
    for (const row of this.data?.adjustmentPanel ?? []) {
      this.setAdjDisposition(row.key, value);
    }
    for (const ws of this.claimWorkstations) {
      const ctx = ws.context;
      if (!ctx) continue;
      (ctx.claimLevelCas ?? []).forEach((c, i) => this.setAdjDisposition(this.casRowKey(c, `cl-${i}`), value));
      for (const s of ctx.serviceLines ?? []) {
        (s.cas ?? []).forEach((c, j) => this.setAdjDisposition(this.casRowKey(c, `sl-${s.lineIndex}-${j}`), value));
      }
    }
    this.info = `Bulk set all visible adjustments to ${value}.`;
    this.cdr.markForCheck();
  }

  toggleAuditPanel(): void {
    this.auditPanelOpen = !this.auditPanelOpen;
    if (this.auditPanelOpen && this.auditTrail.length === 0) this.loadAuditTrail();
    else this.cdr.markForCheck();
  }

  toggleHistoryPanel(): void {
    this.historyPanelOpen = !this.historyPanelOpen;
    if (this.historyPanelOpen && this.postingHistory.length === 0) this.loadPostingHistory();
    else this.cdr.markForCheck();
  }

  loadAuditTrail(): void {
    if (!this.reportId) return;
    this.auditLoading = true;
    this.ediApi.get835AuditTrail(this.reportId).subscribe({
      next: (rows) => {
        this.auditTrail = rows;
        this.auditLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.auditLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadPostingHistory(): void {
    if (!this.reportId) return;
    this.historyLoading = true;
    this.ediApi.get835PostingHistory(this.reportId).subscribe({
      next: (rows) => {
        this.postingHistory = rows;
        this.historyLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.historyLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  exportReviewCsv(): void {
    this.ediApi.export835Review(this.reportId, this.currentFilterOpts()).subscribe({
      next: (blob) => this.downloadBlob(blob, `era-review-${this.reportId}.csv`),
      error: (err) => {
        this.error = err?.error?.error || err?.message || 'Review export failed';
        this.cdr.markForCheck();
      }
    });
  }

  exportReconciliationCsv(): void {
    this.ediApi.export835Reconciliation(this.reportId).subscribe({
      next: (blob) => this.downloadBlob(blob, `era-reconciliation-${this.reportId}.csv`),
      error: (err) => {
        this.error = err?.error?.error || err?.message || 'Reconciliation export failed';
        this.cdr.markForCheck();
      }
    });
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  private currentFilterOpts() {
    return {
      unmatchedOnly: this.filterUnmatched,
      appliedOnly: this.filterApplied,
      duplicatesOnly: this.filterDuplicates,
      reversalsOnly: this.filterReversals,
      payer: this.filterPayer,
      patient: this.filterPatient,
      claimId: this.filterClaimId,
      cpt: this.filterCpt,
      dos: this.filterDos,
      adjustmentCode: this.filterAdj
    };
  }

  onPageSizeChange(raw: string): void {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && this.pageSizeOptions.includes(n)) {
      this.pageSize = n;
      this.page = 1;
      this.loadReview(false);
    }
  }

  get totalPages(): number {
    const t = this.data?.totalLines ?? 0;
    const ps = this.data?.pageSize ?? this.pageSize;
    return Math.max(1, Math.ceil(t / ps));
  }

  loadReview(refresh: boolean): void {
    if (!this.reportId) return;
    if (refresh) {
      this.returnCache.invalidate(this.reportId);
      this.clearUiSnapshot();
    }
    this.loading = true;
    this.error = null;
    this.ediApi
      .get835Review(this.reportId, {
        refresh,
        page: this.page,
        pageSize: this.pageSize,
        unmatchedOnly: this.filterUnmatched,
        appliedOnly: this.filterApplied,
        duplicatesOnly: this.filterDuplicates,
        reversalsOnly: this.filterReversals,
        payer: this.filterPayer,
        patient: this.filterPatient,
        claimId: this.filterClaimId,
        cpt: this.filterCpt,
        dos: this.filterDos,
        adjustmentCode: this.filterAdj
      })
      .subscribe({
        next: (d) => {
          this.data = d;
          this.rebuildWorkstations();
          this.initDisbursementFromReview();
          this.page = d.page;
          this.pageSize = d.pageSize;
          this.loading = false;
          this.selectedLine = null;
          const name = d.report?.fileName || 'ERA';
          this.workspace.updateActiveTabTitle(`ERA — ${name}`);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loading = false;
          const body = err?.error;
          const code = body?.errorCode as string | undefined;
          const msg =
            body?.message ||
            body?.error ||
            (typeof body === 'string' ? body : null) ||
            err?.message ||
            'Failed to load ERA review';
          if (code === 'ReportNotFound') {
            this.error = 'This EDI report was not found for your tenant. It may have been deleted or you may need to switch facility.';
          } else if (code === 'NotAn835') {
            this.error = `${msg} Open the file from EDI Reports using Quick View, or re-download the remittance as an 835.`;
          } else if (code === 'FileUnavailable') {
            this.error = 'ERA file bytes are missing from storage. Re-download the report or contact support.';
          } else if (err?.status === 404) {
            this.error =
              'ERA review endpoint returned 404. Deploy the latest API (GET /api/edi-reports/{id}/review) and run database migrations, then try again.';
          } else {
            this.error = msg;
          }
          this.cdr.markForCheck();
        }
      });
  }

  applyFilters(): void {
    this.page = 1;
    this.loadReview(false);
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadReview(false);
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadReview(false);
    }
  }

  selectLine(row: Era835ReviewLineRowDto): void {
    this.selectedLine = row;
  }

  statusClass(row: Era835ReviewLineRowDto): string {
    switch (row.statusCategory) {
      case 'success':
        return 'era-status era-status--success';
      case 'warning':
        return 'era-status era-status--warning';
      case 'danger':
        return 'era-status era-status--danger';
      default:
        return 'era-status era-status--muted';
    }
  }

  toggleClaimExpand(claimExternalId: string): void {
    const i = this.expandedClaimIds.indexOf(claimExternalId);
    if (i >= 0) this.expandedClaimIds = this.expandedClaimIds.filter((x) => x !== claimExternalId);
    else this.expandedClaimIds = [...this.expandedClaimIds, claimExternalId];
  }

  isClaimExpanded(claimExternalId: string): boolean {
    return this.expandedClaimIds.includes(claimExternalId);
  }

  claimContext(claimExternalId: string): Era835ReviewClaimContextDto | undefined {
    return this.data?.claimContexts?.find((c) => c.claimExternalId === claimExternalId);
  }

  toggleServiceLineExpand(claimExternalId: string, lineIndex: number): void {
    const key = this.serviceLineKey(claimExternalId, lineIndex);
    const i = this.expandedServiceLineKeys.indexOf(key);
    if (i >= 0) {
      this.expandedServiceLineKeys = this.expandedServiceLineKeys.filter((x) => x !== key);
    } else {
      this.expandedServiceLineKeys = [...this.expandedServiceLineKeys, key];
    }
  }

  isServiceLineExpanded(claimExternalId: string, lineIndex: number): boolean {
    return this.expandedServiceLineKeys.includes(this.serviceLineKey(claimExternalId, lineIndex));
  }

  serviceLineKey(claimExternalId: string, lineIndex: number): string {
    return `${claimExternalId}|${lineIndex}`;
  }

  casRowKey(cas: Era835ReviewCasDto, fallback: string): string {
    return (cas.key && cas.key.length > 0) ? cas.key : fallback;
  }

  getAdjDisposition(key: string): AdjDisposition {
    return this.adjDisposition.get(key) ?? 'apply';
  }

  setAdjDisposition(key: string, value: AdjDisposition): void {
    this.adjDisposition.set(key, value);
    this.adjDisposition = new Map(this.adjDisposition);
    this.adjustmentIgnored.set(key, value === 'ignore');
    this.adjustmentIgnored = new Map(this.adjustmentIgnored);
    this.cdr.markForCheck();
  }

  formatCasTotals(totals?: Era835ReviewCasTotalsDto | null): string {
    if (!totals) return '—';
    const parts: string[] = [];
    if (totals.co) parts.push(`CO ${this.formatMoney(totals.co)}`);
    if (totals.pr) parts.push(`PR ${this.formatMoney(totals.pr)}`);
    if (totals.oa) parts.push(`OA ${this.formatMoney(totals.oa)}`);
    if (totals.pi) parts.push(`PI ${this.formatMoney(totals.pi)}`);
    return parts.length ? parts.join(' · ') : '—';
  }

  confidenceHelp(row: Era835ReviewLineRowDto): string {
    const score = this.confidencePercent(row);
    const prefix = score != null ? `Confidence: ${score}%` : 'Confidence: —';
    const factors = this.matchFactorSummary(row);
    const failures = row.matching?.failureReasons?.length
      ? `Failed because: ${row.matching.failureReasons.join(' ')}`
      : '';
    const explanation =
      row.confidenceExplanation ||
      row.matching?.confidenceExplanation ||
      row.matching?.unmatchedReason ||
      '';
    return [prefix, factors, failures, explanation].filter((s) => !!s).join('\n');
  }

  confidencePercent(row: Era835ReviewLineRowDto): number | null {
    const score = row.confidenceScore ?? row.matching?.confidenceScore;
    return score != null && Number.isFinite(score) ? Math.round(score) : null;
  }

  confidenceLabel(row: Era835ReviewLineRowDto): string {
    const pct = this.confidencePercent(row);
    return pct != null ? `${pct}%` : row.matchingConfidence || '—';
  }

  matchedFactors(row: Era835ReviewLineRowDto) {
    return (row.matching?.matchFactors ?? []).filter((f) => f.matched);
  }

  failedFactors(row: Era835ReviewLineRowDto) {
    return (row.matching?.matchFactors ?? []).filter((f) => !f.matched);
  }

  matchFactorSummary(row: Era835ReviewLineRowDto): string {
    const matched = this.matchedFactors(row);
    if (!matched?.length) return '';
    return 'Matched because: ' + matched.map((f) => f.factor).join(', ');
  }

  getManualMatchDraft(claimExternalId: string): { claimId: string; notes: string } {
    return this.manualMatchDraft.get(claimExternalId) ?? {
      claimId: '',
      notes: ''
    };
  }

  setManualMatchClaimId(claimExternalId: string, value: string): void {
    const cur = this.getManualMatchDraft(claimExternalId);
    this.manualMatchDraft.set(claimExternalId, { ...cur, claimId: value });
    this.manualMatchDraft = new Map(this.manualMatchDraft);
  }

  setManualMatchNotes(claimExternalId: string, value: string): void {
    const cur = this.getManualMatchDraft(claimExternalId);
    this.manualMatchDraft.set(claimExternalId, { ...cur, notes: value });
    this.manualMatchDraft = new Map(this.manualMatchDraft);
  }

  saveManualMatch(ctx: Era835ReviewClaimContextDto, lineIndex = 0): void {
    const draft = this.getManualMatchDraft(ctx.claimExternalId);
    const claimId = Number.parseInt(draft.claimId, 10);
    if (!Number.isFinite(claimId) || claimId <= 0) {
      this.error = 'Enter a valid internal claim id to link.';
      return;
    }
    this.manualMatching = true;
    this.error = null;
    this.ediApi.manualMatch(this.reportId, {
      claimExternalId: ctx.claimExternalId,
      lineIndexInClaim: lineIndex,
      matchedClaimId: claimId,
      notes: draft.notes?.trim() || null
    }).subscribe({
      next: () => {
        this.manualMatching = false;
        this.info = `Claim ${ctx.claimExternalId} linked to internal claim ${claimId}.`;
        this.loadReview(true);
      },
      error: (err) => {
        this.manualMatching = false;
        this.error = err?.error?.error || err?.message || 'Manual match failed';
      }
    });
  }

  toggleAdjIgnore(key: string): void {
    this.adjustmentIgnored.set(key, !this.adjustmentIgnored.get(key));
    this.adjustmentIgnored = new Map(this.adjustmentIgnored);
  }

  isAdjIgnored(key: string): boolean {
    return !!this.adjustmentIgnored.get(key);
  }

  disbursementKey(claimExternalId: string, serviceLineId: number): string {
    return `${claimExternalId}|${serviceLineId}`;
  }

  initDisbursementFromReview(): void {
    this.disbursementState.clear();
    this.creditDisposition.clear();
    for (const ctx of this.data?.claimContexts ?? []) {
      const plan = ctx.disbursementPlan;
      if (plan?.lines?.length) {
        for (const line of plan.lines) {
          this.disbursementState.set(this.disbursementKey(ctx.claimExternalId, line.serviceLineId), {
            apply: line.defaultApply,
            amount: line.defaultAmount ?? 0
          });
        }
      }
      this.creditDisposition.set(ctx.claimExternalId, {
        insurance: 'Hold',
        patient: 'Hold'
      });
    }
    this.disbursementState = new Map(this.disbursementState);
    this.creditDisposition = new Map(this.creditDisposition);
  }

  getDisbursementRow(ctx: Era835ReviewClaimContextDto, line: Era835ReviewDisbursementLineDto): DisbursementRowState {
    const key = this.disbursementKey(ctx.claimExternalId, line.serviceLineId);
    return this.disbursementState.get(key) ?? { apply: line.defaultApply, amount: line.defaultAmount ?? 0 };
  }

  setDisbursementApply(ctx: Era835ReviewClaimContextDto, line: Era835ReviewDisbursementLineDto, apply: boolean): void {
    const key = this.disbursementKey(ctx.claimExternalId, line.serviceLineId);
    const cur = this.getDisbursementRow(ctx, line);
    const next: DisbursementRowState = {
      apply,
      amount: apply && cur.amount <= 0 ? (line.defaultAmount || line.openBalance || 0) : cur.amount
    };
    this.disbursementState.set(key, next);
    this.disbursementState = new Map(this.disbursementState);
  }

  setDisbursementAmount(ctx: Era835ReviewClaimContextDto, line: Era835ReviewDisbursementLineDto, raw: string): void {
    const key = this.disbursementKey(ctx.claimExternalId, line.serviceLineId);
    const cur = this.getDisbursementRow(ctx, line);
    const parsed = Number.parseFloat(raw);
    const amount = Number.isFinite(parsed) ? Math.max(0, this.roundMoney(parsed)) : 0;
    this.disbursementState.set(key, { ...cur, amount, apply: amount > 0 ? true : cur.apply });
    this.disbursementState = new Map(this.disbursementState);
  }

  disbursementPaymentAmount(ctx: Era835ReviewClaimContextDto): number {
    return this.roundMoney(ctx.disbursementPlan?.paymentAmount835 ?? ctx.claimPayment835 ?? 0);
  }

  disbursementAllocated(ctx: Era835ReviewClaimContextDto): number {
    const plan = ctx.disbursementPlan;
    if (!plan?.lines?.length) return 0;
    let sum = 0;
    for (const line of plan.lines) {
      const row = this.getDisbursementRow(ctx, line);
      if (row.apply && row.amount > 0) sum += row.amount;
    }
    return this.roundMoney(sum);
  }

  disbursementRemaining(ctx: Era835ReviewClaimContextDto): number {
    return this.roundMoney(this.disbursementPaymentAmount(ctx) - this.disbursementAllocated(ctx));
  }

  disbursementUnapplied(ctx: Era835ReviewClaimContextDto): number {
    const rem = this.disbursementRemaining(ctx);
    return rem > 0 ? rem : 0;
  }

  hasOverDisbursement(ctx: Era835ReviewClaimContextDto): boolean {
    return this.disbursementRemaining(ctx) < -0.009;
  }

  exceedsLineBalance(ctx: Era835ReviewClaimContextDto, line: Era835ReviewDisbursementLineDto): boolean {
    const row = this.getDisbursementRow(ctx, line);
    return row.apply && row.amount > (line.openBalance ?? 0) + 0.009;
  }

  anyExceedsLineBalance(ctx: Era835ReviewClaimContextDto): boolean {
    return (ctx.disbursementPlan?.lines ?? []).some((l) => this.exceedsLineBalance(ctx, l));
  }

  canApplyReview(): boolean {
    if (!this.data || this.data.report.fileType !== '835') return false;
    const status = (this.data.report.status || '').toLowerCase();
    if (status === 'processing') return false;
    if (status === 'posted') return false;
    for (const ws of this.claimWorkstations) {
      const ctx = ws.context;
      if (!ctx?.matchedClaimId || !ctx.disbursementPlan) continue;
      if (this.hasOverDisbursement(ctx) || this.anyExceedsLineBalance(ctx)) return false;
    }
    return true;
  }

  canReversePayments(): boolean {
    if (!this.data || this.data.report.fileType !== '835') return false;
    const status = (this.data.report.status || '').toLowerCase();
    return status === 'posted' && (this.data.summary.appliedLineCount ?? 0) > 0;
  }

  projectedInsuranceCredit(ctx: Era835ReviewClaimContextDto): number {
    const fromApi = ctx.creditSummary?.projectedInsuranceCredit;
    if (fromApi != null && fromApi > 0) {
      const allocated = this.disbursementAllocated(ctx);
      const payment = this.disbursementPaymentAmount(ctx);
      return this.roundMoney(Math.max(0, payment - allocated));
    }
    return this.roundMoney(Math.max(0, this.disbursementPaymentAmount(ctx) - this.disbursementAllocated(ctx)));
  }

  getCreditDisposition(ctx: Era835ReviewClaimContextDto): CreditDispositionState {
    return this.creditDisposition.get(ctx.claimExternalId) ?? { insurance: 'Hold', patient: 'Hold' };
  }

  setInsuranceCreditDisposition(ctx: Era835ReviewClaimContextDto, value: CreditDisposition): void {
    const cur = this.getCreditDisposition(ctx);
    this.creditDisposition.set(ctx.claimExternalId, { ...cur, insurance: value });
    this.creditDisposition = new Map(this.creditDisposition);
  }

  setPatientCreditDisposition(ctx: Era835ReviewClaimContextDto, value: CreditDisposition): void {
    const cur = this.getCreditDisposition(ctx);
    this.creditDisposition.set(ctx.claimExternalId, { ...cur, patient: value });
    this.creditDisposition = new Map(this.creditDisposition);
  }

  buildApplyRequest(): Era835ReviewApplyRequestDto {
    const casDispositions: Era835CasDispositionDto[] = Array.from(this.adjDisposition.entries()).map(([key, disposition]) => ({
      key,
      disposition
    }));
    const claims = (this.data?.claimContexts ?? [])
      .filter((c) => (c.matchedClaimId || this.getManualMatchDraft(c.claimExternalId).claimId) && c.disbursementPlan?.lines?.length)
      .map((ctx) => {
        const disp = this.getCreditDisposition(ctx);
        const draft = this.getManualMatchDraft(ctx.claimExternalId);
        const manualParsed = Number.parseInt(draft.claimId, 10);
        const manualClaimId = Number.isFinite(manualParsed) && manualParsed > 0 ? manualParsed : undefined;
        return {
          claimExternalId: ctx.claimExternalId,
          insuranceCreditDisposition: disp.insurance,
          patientCreditDisposition: disp.patient,
          manualClaimId,
          allocations: (ctx.disbursementPlan?.lines ?? []).map((line) => {
            const row = this.getDisbursementRow(ctx, line);
            return {
              serviceLineId: line.serviceLineId,
              applyDisbursement: row.apply,
              amount: row.apply ? row.amount : 0
            };
          })
        };
      });
    return { claims, casDispositions };
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  applyPayments(): void {
    if (!this.canApplyReview()) {
      this.error = 'Fix over-disbursement on one or more claims before applying.';
      return;
    }
    this.applying = true;
    this.info = null;
    this.error = null;
    const body = this.buildApplyRequest();
    this.ediApi.apply(this.reportId, body).subscribe({
      next: (r) => {
        this.applying = false;
        const unapplied = this.claimWorkstations
          .map((ws) => ws.context)
          .filter((c): c is Era835ReviewClaimContextDto => !!c)
          .reduce((sum, c) => sum + this.disbursementUnapplied(c), 0);
        const unappliedNote = unapplied > 0.009 ? ` Unapplied: ${this.formatMoney(unapplied)}.` : '';
        this.info = `Apply complete: processed ${r.processed}, applied ${r.applied}, unmatched ${r.unmatched}${r.creditsCreated != null ? `, credits ${r.creditsCreated}` : ''}.${unappliedNote}`;
        this.loadReview(true);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.applying = false;
        this.error = err?.error?.error || err?.message || 'Apply failed';
        this.cdr.markForCheck();
      }
    });
  }

  reversePayments(): void {
    if (!this.canReversePayments()) return;
    this.reversing = true;
    this.error = null;
    this.info = null;
    this.ediApi.reverse(this.reportId).subscribe({
      next: (r) => {
        this.reversing = false;
        this.info = `Reverse complete: reversed ${r.reversed}, skipped ${r.skipped}.`;
        this.loadReview(true);
      },
      error: (err) => {
        this.reversing = false;
        this.error = err?.error?.error || err?.message || 'Reverse failed';
      }
    });
  }

  exportEra(): void {
    this.ediApi.exportFile(this.reportId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.data?.report?.fileName || 'era.edi';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.error = err?.error?.error || err?.message || 'Export failed';
      }
    });
  }

  viewRawEdi(): void {
    this.rawEdiOpen = true;
    this.rawEdiText = null;
    this.ediApi.getContent(this.reportId, false).subscribe({
      next: (t) => (this.rawEdiText = t),
      error: () => (this.rawEdiText = 'Could not load raw EDI.')
    });
  }

  closeRaw(): void {
    this.rawEdiOpen = false;
    this.rawEdiText = null;
  }

  close(): void {
    this.returnCache.invalidate(this.reportId);
    this.clearUiSnapshot();
    void this.router.navigate(['/edi-reports']);
  }

  /** Serialized URL for middle-click / open in new tab (same path as routerLink). */
  claimHref(claimId: number): string {
    return this.router.serializeUrl(this.router.createUrlTree(['/claims', claimId]));
  }

  /**
   * Primary same-tab navigation: persist UI + in-memory review payload so returning does not refetch.
   * Modifier / middle-click: skip stash so the ERA tab keeps current state (new tab loads claim on its own).
   */
  onClaimNavClick(ev: MouseEvent): void {
    ev.stopPropagation();
    if (ev.button !== 0) return;
    if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return;
    this.persistUiBeforeClaimNav();
    if (this.data) this.returnCache.stashForClaimNavigation(this.reportId, this.data);
  }

  private uiStorageKey(): string {
    return `era835-review-ui:${this.reportId}`;
  }

  private readUiSnapshot(): Era835ReviewUiSnapshot | null {
    try {
      const raw = sessionStorage.getItem(this.uiStorageKey());
      if (!raw) return null;
      const o = JSON.parse(raw) as Era835ReviewUiSnapshot;
      return o?.version === 1 ? o : null;
    } catch {
      return null;
    }
  }

  private clearUiSnapshot(): void {
    try {
      sessionStorage.removeItem(this.uiStorageKey());
    } catch {
      /* ignore */
    }
  }

  private applyUiSnapshot(s: Era835ReviewUiSnapshot): void {
    this.page = s.page;
    this.pageSize = s.pageSize;
    this.filterUnmatched = s.filterUnmatched;
    this.filterApplied = s.filterApplied;
    this.filterDuplicates = s.filterDuplicates;
    this.filterReversals = s.filterReversals;
    this.filterPayer = s.filterPayer ?? '';
    this.filterPatient = s.filterPatient ?? '';
    this.filterClaimId = s.filterClaimId ?? '';
    this.filterCpt = s.filterCpt ?? '';
    this.filterDos = s.filterDos ?? '';
    this.filterAdj = s.filterAdj ?? '';
    this.expandedClaimIds = Array.isArray(s.expandedClaimIds) ? [...s.expandedClaimIds] : [];
    this.expandedServiceLineKeys = Array.isArray(s.expandedServiceLineKeys) ? [...s.expandedServiceLineKeys] : [];
  }

  private persistUiBeforeClaimNav(): void {
    const scrollTop = this.tableScroll?.nativeElement?.scrollTop ?? 0;
    const snap: Era835ReviewUiSnapshot = {
      version: 1,
      page: this.page,
      pageSize: this.pageSize,
      filterUnmatched: this.filterUnmatched,
      filterApplied: this.filterApplied,
      filterDuplicates: this.filterDuplicates,
      filterReversals: this.filterReversals,
      filterPayer: this.filterPayer,
      filterPatient: this.filterPatient,
      filterClaimId: this.filterClaimId,
      filterCpt: this.filterCpt,
      filterDos: this.filterDos,
      filterAdj: this.filterAdj,
      expandedClaimIds: [...this.expandedClaimIds],
      expandedServiceLineKeys: [...this.expandedServiceLineKeys],
      scrollTop
    };
    try {
      sessionStorage.setItem(this.uiStorageKey(), JSON.stringify(snap));
    } catch {
      /* ignore quota */
    }
  }

  private queueRestoreScroll(scrollTop: number): void {
    const y = Math.max(0, scrollTop);
    const apply = () => {
      const el = this.tableScroll?.nativeElement;
      if (el) el.scrollTop = y;
    };
    queueMicrotask(apply);
    requestAnimationFrame(apply);
    setTimeout(apply, 0);
    setTimeout(apply, 50);
  }

  formatMoney(v: number | null | undefined): string {
    if (v == null || Number.isNaN(v)) return '—';
    return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatDate(v: string | null | undefined): string {
    if (!v) return '—';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString();
  }
}
