import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  EdiReportsApiService,
  Era835ReviewClaimContextDto,
  Era835ReviewLineRowDto,
  Era835ReviewResponseDto
} from '../core/services/edi-reports-api.service';
import { Era835ReviewReturnCacheService } from '../core/services/era835-review-return-cache.service';
import { WorkspaceService } from '../workspace/application/workspace.service';
import { Era835ReviewUiSnapshot } from './edi-era-review-ui.snapshot';

@Component({
  selector: 'app-edi-era-review',
  templateUrl: './edi-era-review.component.html',
  styleUrls: ['./edi-era-review.component.scss']
})
export class EdiEraReviewComponent implements OnInit {
  @ViewChild('tableScroll') tableScroll?: ElementRef<HTMLElement>;
  reportId = '';
  loading = false;
  applying = false;
  error: string | null = null;
  info: string | null = null;
  data: Era835ReviewResponseDto | null = null;
  selectedLine: Era835ReviewLineRowDto | null = null;
  expandedClaimIds: string[] = [];
  adjustmentIgnored = new Map<string, boolean>();

  page = 1;
  pageSize = 100;
  filterUnmatched = false;
  filterApplied = false;
  filterDuplicates = false;
  filterReversals = false;
  filterPayer = '';
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
    private returnCache: Era835ReviewReturnCacheService
  ) {}

  ngOnInit(): void {
    this.reportId = this.route.snapshot.paramMap.get('id') || '';
    this.workspace.updateActiveTabTitle('ERA Payment Review');
    const uiSnap = this.readUiSnapshot();
    const cached = this.returnCache.consumePayload(this.reportId);
    if (uiSnap) this.applyUiSnapshot(uiSnap);
    if (cached) {
      this.data = cached;
      this.loading = false;
      this.error = null;
      const name = cached.report?.fileName || 'ERA';
      this.workspace.updateActiveTabTitle(`ERA — ${name}`);
      this.queueRestoreScroll(uiSnap?.scrollTop ?? 0);
      return;
    }
    this.loadReview(false);
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
        claimId: this.filterClaimId,
        cpt: this.filterCpt,
        dos: this.filterDos,
        adjustmentCode: this.filterAdj
      })
      .subscribe({
        next: (d) => {
          this.data = d;
          this.page = d.page;
          this.pageSize = d.pageSize;
          this.loading = false;
          this.selectedLine = null;
          const name = d.report?.fileName || 'ERA';
          this.workspace.updateActiveTabTitle(`ERA — ${name}`);
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

  toggleAdjIgnore(key: string): void {
    this.adjustmentIgnored.set(key, !this.adjustmentIgnored.get(key));
    this.adjustmentIgnored = new Map(this.adjustmentIgnored);
  }

  isAdjIgnored(key: string): boolean {
    return !!this.adjustmentIgnored.get(key);
  }

  applyPayments(): void {
    this.applying = true;
    this.info = null;
    this.ediApi.apply(this.reportId).subscribe({
      next: (r) => {
        this.applying = false;
        this.info = `Apply complete: processed ${r.processed}, applied ${r.applied}, unmatched ${r.unmatched}.`;
        this.loadReview(true);
      },
      error: (err) => {
        this.applying = false;
        this.error = err?.error?.error || err?.message || 'Apply failed';
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
    this.filterClaimId = s.filterClaimId ?? '';
    this.filterCpt = s.filterCpt ?? '';
    this.filterDos = s.filterDos ?? '';
    this.filterAdj = s.filterAdj ?? '';
    this.expandedClaimIds = Array.isArray(s.expandedClaimIds) ? [...s.expandedClaimIds] : [];
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
      filterClaimId: this.filterClaimId,
      filterCpt: this.filterCpt,
      filterDos: this.filterDos,
      filterAdj: this.filterAdj,
      expandedClaimIds: [...this.expandedClaimIds],
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
