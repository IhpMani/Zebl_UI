import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { RibbonContextService } from '../../core/services/ribbon-context.service';
import { PaginationMeta } from '../../core/services/patient.models';
import { WorkspaceService } from '../../workspace/application/workspace.service';
import { PatientNavigationService } from '../../features/patients/services/patient-navigation.service';
import { PatientLookupQueryService } from '../../features/patients/services/queries/patient-lookup-query.service';
import { PatientLookupRowDto } from '../../features/patients/models/patient-lookup-row.dto';
import { PatientWorkspacePersistenceService } from '../../features/patients/services/patient-workspace-persistence.service';

@Component({
  selector: 'app-patient-list',
  templateUrl: './patient-list.component.html',
  styleUrls: ['./patient-list.component.css', '../patient-directory/patient-directory.polish.css']
})
export class PatientListComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('gridHost') gridHost?: ElementRef<HTMLElement>;

  rows: PatientLookupRowDto[] = [];
  displayRows: PatientLookupRowDto[] = [];
  loading = false;
  error: string | null = null;
  meta: PaginationMeta | null = null;
  searchStatus = '';
  recentSearches: string[] = [];
  highlightedIndex = 0;
  hasLoadedOnce = false;

  globalSearchText = '';
  dobFilter = '';
  payerFilter = '';
  payerFilterOptions: string[] = [];
  activeFilter: 'all' | 'active' | 'inactive' = 'active';

  currentPage = 1;
  pageSize = 25;

  private readonly destroy$ = new Subject<void>();
  private readonly searchDebounced$ = new Subject<string>();

  constructor(
    private readonly lookupQuery: PatientLookupQueryService,
    private readonly ribbonContext: RibbonContextService,
    private readonly workspace: WorkspaceService,
    private readonly navigation: PatientNavigationService,
    private readonly persistence: PatientWorkspacePersistenceService
  ) {}

  ngOnInit(): void {
    this.workspace.updateActiveTabTitle('Patient Lookup');
    this.recentSearches = this.persistence.getRecentSearches();

    this.searchDebounced$
      .pipe(debounceTime(320), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.loadPatients(1, this.pageSize));

    this.loadPatients(1, this.pageSize);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      if (event.key === 'Escape' && target === this.searchInput?.nativeElement) {
        event.preventDefault();
        this.clearGlobalSearch();
      }
      return;
    }

    if (this.displayRows.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.displayRows.length - 1);
      this.scrollActiveRowIntoView();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
      this.scrollActiveRowIntoView();
    } else if (event.key === 'Enter') {
      const row = this.displayRows[this.highlightedIndex];
      if (row) {
        event.preventDefault();
        this.openPatient(row);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.clearGlobalSearch();
      this.searchInput?.nativeElement.focus();
    }
  }

  onSearchInput(): void {
    this.searchDebounced$.next(this.globalSearchText);
  }

  loadPatients(page: number, pageSize: number): void {
    this.loading = true;
    this.error = null;
    this.currentPage = page;
    this.pageSize = Math.min(pageSize, 50);
    this.searchStatus = 'Searching…';

    const filters = {
      searchText: this.globalSearchText.trim() || undefined,
      active: this.resolveActiveFilter(),
      page,
      pageSize: this.pageSize
    };

    this.lookupQuery
      .searchDirectory(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.rows = result.rows;
          this.displayRows = this.applyClientFilters(result.rows);
          this.meta = {
            page: result.page,
            pageSize: result.pageSize,
            totalCount: result.totalCount
          };
          this.refreshPayerFilterOptions();
          this.highlightedIndex = 0;
          this.loading = false;
          this.hasLoadedOnce = true;
          this.updateSearchStatus();

          const q = this.globalSearchText.trim();
          if (q.length >= 2) {
            this.persistence.pushRecentSearch(q);
            this.recentSearches = this.persistence.getRecentSearches();
          }
        },
        error: (err) => {
          this.loading = false;
          this.hasLoadedOnce = true;
          this.error =
            this.lookupQuery.errorMessage(err) ??
            'Failed to load patients. Check that the API is running.';
          this.searchStatus = '';
          this.rows = [];
          this.displayRows = [];
        }
      });
  }

  retryLoad(): void {
    this.loadPatients(this.currentPage, this.pageSize);
  }

  onGlobalSearch(): void {
    this.loadPatients(1, this.pageSize);
  }

  clearGlobalSearch(): void {
    this.globalSearchText = '';
    this.dobFilter = '';
    this.payerFilter = '';
    this.activeFilter = 'active';
    this.loadPatients(1, this.pageSize);
  }

  applyRecentSearch(term: string): void {
    this.globalSearchText = term;
    this.loadPatients(1, this.pageSize);
    this.searchInput?.nativeElement.focus();
  }

  onActiveFilterChange(): void {
    this.loadPatients(1, this.pageSize);
  }

  onPayerFilterChange(): void {
    this.displayRows = this.applyClientFilters(this.rows);
    this.highlightedIndex = 0;
    this.updateSearchStatus();
  }

  onDobFilterChange(): void {
    this.displayRows = this.applyClientFilters(this.rows);
    this.highlightedIndex = 0;
    this.updateSearchStatus();
  }

  onPageChange(page: number): void {
    this.loadPatients(page, this.pageSize);
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize = Math.min(pageSize, 50);
    this.loadPatients(1, this.pageSize);
  }

  onRowClick(row: PatientLookupRowDto, index: number): void {
    this.highlightedIndex = index;
    this.openPatient(row);
  }

  onRowHover(index: number): void {
    this.highlightedIndex = index;
  }

  openPatient(row: PatientLookupRowDto): void {
    const patId = this.resolvePatientId(row);
    if (patId == null) return;

    const patientName = row.patientName?.trim() || null;
    this.ribbonContext.setContext({
      patientId: patId,
      patientName,
      claimId: null
    });
    if (patientName) {
      this.workspace.updateActiveTabTitle(patientName);
    }
    this.navigation.navigateToPatientWorkspace(patId, 'overview');
  }

  /** Patient lookup opens the modern workspace, not claims or the classic details form. */
  private resolvePatientId(row: PatientLookupRowDto): number | null {
    const patId = Number(row.patId);
    return Number.isFinite(patId) && patId > 0 ? patId : null;
  }

  goNewPatient(): void {
    this.navigation.navigateToNewPatient();
  }

  emptyStateTitle(): string {
    if (this.globalSearchText.trim()) return 'No matching patients';
    if (this.activeFilter === 'inactive') return 'No inactive patients on this page';
    return 'No patients on this page';
  }

  emptyStateHint(): string {
    if (this.globalSearchText.trim()) {
      return 'Try account number, MRN, or a different spelling.';
    }
    return 'Adjust status filter or search to narrow results.';
  }

  initials(row: PatientLookupRowDto): string {
    const parts = (row.patientName ?? '').replace(/,/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  isActive(row: PatientLookupRowDto): boolean {
    return (row.status ?? '').toLowerCase() === 'active';
  }

  formatDob(dob: string | null): string {
    if (!dob) return '—';
    const d = new Date(dob);
    return Number.isNaN(d.getTime()) ? dob : d.toLocaleDateString();
  }

  formatLastDos(lastDos: string | null): string {
    if (!lastDos) return '—';
    const d = new Date(lastDos);
    return Number.isNaN(d.getTime()) ? lastDos : d.toLocaleDateString();
  }

  paginationSummary(): string {
    if (!this.meta) return '';
    const start = this.meta.totalCount === 0 ? 0 : (this.meta.page - 1) * this.pageSize + 1;
    const end = Math.min(this.meta.page * this.pageSize, this.meta.totalCount);
    return `Showing ${start} to ${end} of ${this.meta.totalCount} results`;
  }

  visiblePageNumbers(): number[] {
    const total = this.getTotalPages();
    const current = this.meta?.page ?? 1;
    const window = 5;
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + window - 1);
    start = Math.max(1, end - window + 1);
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  getTotalPages(): number {
    if (!this.meta) return 1;
    return Math.max(1, Math.ceil(this.meta.totalCount / this.pageSize));
  }

  trackRow(_: number, row: PatientLookupRowDto): number {
    return row.patId;
  }

  private updateSearchStatus(): void {
    const total = this.meta?.totalCount ?? 0;
    const shown = this.displayRows.length;
    const q = this.globalSearchText.trim();
    if (this.dobFilter || this.payerFilter) {
      this.searchStatus = `${shown} shown on page · ${total} from server`;
    } else if (q) {
      this.searchStatus = `${total} match${total === 1 ? '' : 'es'} for “${q}”`;
    } else {
      this.searchStatus = `${total} patient${total === 1 ? '' : 's'}`;
    }
  }

  private scrollActiveRowIntoView(): void {
    requestAnimationFrame(() => {
      const el = this.gridHost?.nativeElement.querySelector('.pd-grid__row--active');
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  private resolveActiveFilter(): boolean | undefined {
    if (this.activeFilter === 'active') return true;
    if (this.activeFilter === 'inactive') return false;
    return undefined;
  }

  private applyClientFilters(rows: PatientLookupRowDto[]): PatientLookupRowDto[] {
    let result = rows;
    if (this.dobFilter) {
      result = result.filter((r) => {
        if (!r.dob) return false;
        const d = new Date(r.dob);
        return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === this.dobFilter;
      });
    }
    if (this.payerFilter) {
      result = result.filter((r) => (r.primaryPayer ?? '') === this.payerFilter);
    }
    return result;
  }

  private refreshPayerFilterOptions(): void {
    const set = new Set<string>();
    for (const r of this.rows) {
      if (r.primaryPayer) set.add(r.primaryPayer);
    }
    this.payerFilterOptions = [...set].sort();
  }
}
