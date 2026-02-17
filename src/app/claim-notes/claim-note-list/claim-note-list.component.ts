import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ClaimNoteApiService } from '../../core/services/claim-note-api.service';
import { ClaimNoteListItem, ClaimNotesApiResponse, PaginationMeta } from '../../core/services/claim-note.models';
import { Subject, takeUntil } from 'rxjs';
import { ClaimListAdditionalColumns, AdditionalColumnDefinition } from '../../claims/claim-list/claim-list-additional-columns';

@Component({
  selector: 'app-claim-note-list',
  templateUrl: './claim-note-list.component.html',
  styleUrls: ['./claim-note-list.component.css']
})
export class ClaimNoteListComponent implements OnInit, OnDestroy {
  claimNotes: ClaimNoteListItem[] = [];
  filteredClaimNotes: ClaimNoteListItem[] = [];
  loading: boolean = false;
  error: string | null = null;
  meta: PaginationMeta | null = null;
  showCustomizationDialog: boolean = false;
  columnSearchText: string = '';
  showFilterPopup: boolean = false;
  activeFilterColumnKey: string | null = null;
  filterPopupSearchText: string = '';
  filterPopupPosition = { topPx: 0, leftPx: 0 };
  columnValueFilters: Record<string, Set<string>> = {};
  popupAllValues: string[] = [];
  popupSelectedValues: Set<string> = new Set<string>();
  popupTextFilter: string = '';

  availableRelatedColumns: Array<{ table: string; key: string; label: string; path: string }> = [];
  selectedAdditionalColumns: Set<string> = new Set<string>();

  /** Note columns + all Claim List columns (same as Claim List) */
  columns: Array<{ key: string; label: string; visible: boolean; filterValue: string; isRelatedColumn?: boolean; table?: string; dataType?: string }> = this.buildInitialColumns();

  /** Map ClaimListAdditionalColumns keys to notes API response keys */
  private static readonly NOTES_API_KEY_MAP: Record<string, string> = {
    claFirstDOS: 'claFirstDateTRIG',
    claLastDOS: 'claLastDateTRIG',
    claTotalCharge: 'claTotalChargeTRIG',
    claTotalBalance: 'claTotalBalanceCC',
    claCreatedTimestamp: 'claDateTimeCreated',
    claModifiedTimestamp: 'claDateTimeModified',
    patID: 'claPatFID'
  };

  private buildInitialColumns(): Array<{ key: string; label: string; visible: boolean; filterValue: string; isRelatedColumn?: boolean; table?: string; dataType?: string }> {
    const noteCols: Array<{ key: string; label: string; visible: boolean; filterValue: string; dataType: string }> = [
      { key: 'activityDate', label: 'Timestamp', visible: true, filterValue: '', dataType: 'datetime' },
      { key: 'userName', label: 'User', visible: true, filterValue: '', dataType: 'string' },
      { key: 'noteText', label: 'Note Text', visible: true, filterValue: '', dataType: 'string' }
    ];
    const claimCols = ClaimListAdditionalColumns.AVAILABLE_COLUMNS.map(c => {
      const apiKey = ClaimNoteListComponent.NOTES_API_KEY_MAP[c.key] ?? c.key;
      return {
        key: apiKey,
        label: c.label,
        visible: ['claID', 'claStatus', 'claTotalChargeTRIG', 'claTotalBalanceCC', 'patFullNameCC'].includes(apiKey),
        filterValue: '',
        dataType: c.dataType
      };
    });
    const auditCols = [
      { key: 'totalCharge', label: 'Note Total Charge', visible: true, filterValue: '', dataType: 'currency' },
      { key: 'insuranceBalance', label: 'Insurance Balance', visible: true, filterValue: '', dataType: 'currency' },
      { key: 'patientBalance', label: 'Patient Balance', visible: true, filterValue: '', dataType: 'currency' },
      { key: 'patientName', label: 'Patient', visible: true, filterValue: '', dataType: 'string' }
    ];
    const seen = new Set<string>();
    const out: Array<{ key: string; label: string; visible: boolean; filterValue: string; isRelatedColumn?: boolean; table?: string; dataType?: string }> = [];
    [...noteCols, ...claimCols, ...auditCols].forEach(c => {
      if (!seen.has(c.key)) { seen.add(c.key); out.push({ ...c, isRelatedColumn: false }); }
    });
    return out;
  }

  constructor(private claimNoteApiService: ClaimNoteApiService, private router: Router) { }
  currentPage: number = 1;
  pageSize: number = 25;

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.loadAvailableColumns();
    this.loadClaimNotes(this.currentPage, this.pageSize);
  }

  loadAvailableColumns(): void {
    this.claimNoteApiService.getAvailableColumns()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const cols = response?.data || response;
          this.availableRelatedColumns = Array.isArray(cols) ? cols : [];
        },
        error: () => { this.availableRelatedColumns = []; }
      });
  }

  loadClaimNotes(page: number, pageSize: number): void {
    this.loading = true;
    this.error = null;
    this.currentPage = page;
    const filters: any = {};
    const textFilters = this.columns.filter(c => c.filterValue && c.filterValue.toString().trim() !== '').map(c => c.filterValue.toString().trim()).join(' ');
    if (textFilters) filters.searchText = textFilters;
    if (this.selectedAdditionalColumns.size > 0) {
      filters.additionalColumns = Array.from(this.selectedAdditionalColumns);
    }

    this.claimNoteApiService.getClaimNotes(page, pageSize, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ClaimNotesApiResponse) => {
          // Handle both direct { data, meta } and wrapped { data: { data, meta } } responses
          const data = Array.isArray(response?.data)
            ? response.data
            : Array.isArray((response as any)?.data?.data)
              ? (response as any).data.data
              : [];
          const meta = response?.meta ?? (response as any)?.data?.meta ?? null;
          this.claimNotes = data;
          this.filteredClaimNotes = this.applyValueFilters(this.claimNotes);
          this.meta = meta;
          this.loading = false;
          this.error = null;
        },
        error: (err) => {
          if (err.status === 0) {
            console.warn('Request cancelled or network error (likely due to navigation):', err);
          } else {
            this.error = 'Failed to load claim notes. Please check if the backend is running.';
            console.error('Error loading claim notes:', err);
          }
          this.loading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onPageChange(page: number): void { this.loadClaimNotes(page, this.pageSize); }
  onPageSizeChange(pageSize: number): void { this.pageSize = pageSize; this.loadClaimNotes(1, pageSize); }
  onRowClick(note: ClaimNoteListItem): void { this.router.navigate(['/claims', note.claID]); }
  getTotalPages(): number { if (!this.meta) return 0; return Math.ceil(this.meta.totalCount / this.meta.pageSize); }
  hasActiveValueFilters(): boolean {
    return Object.keys(this.columnValueFilters || {}).length > 0;
  }
  get visibleColumns() { return this.columns.filter(c => c.visible); }
  hideColumn(columnKey: string): void { const col = this.columns.find(c => c.key === columnKey); if (col) col.visible = false; }
  showColumn(columnKey: string): void { const col = this.columns.find(c => c.key === columnKey); if (col) col.visible = true; }
  onFilterChange(): void { this.loadClaimNotes(1, this.pageSize); }
  clearFilter(columnKey: string, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    const col = this.columns.find(c => c.key === columnKey);
    if (col) { col.filterValue = ''; delete this.columnValueFilters[columnKey]; this.loadClaimNotes(1, this.pageSize); }
  }
  getCellValue(note: ClaimNoteListItem, key: string): any {
    const rec = note as unknown as Record<string, unknown>;
    const addCols = rec['additionalColumns'] as Record<string, unknown> | undefined;
    if (addCols && typeof addCols === 'object' && key in addCols) return addCols[key];
    return rec[key];
  }
  openFilterPopup(columnKey: string, event: MouseEvent): void {
    event.stopPropagation();
    this.activeFilterColumnKey = columnKey;
    this.filterPopupSearchText = '';
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const popupWidth = 260;
    const popupMaxHeight = Math.min(420, window.innerHeight - 24);
    let topPx = Math.round(rect.bottom + 6);
    if (topPx + popupMaxHeight > window.innerHeight) topPx = Math.max(8, window.innerHeight - popupMaxHeight);
    let leftPx = Math.round(rect.left);
    if (leftPx + popupWidth > window.innerWidth - 8) leftPx = Math.max(8, window.innerWidth - popupWidth - 8);
    this.filterPopupPosition = { topPx, leftPx };
    this.popupAllValues = this.getAllUniqueValuesForColumn(columnKey);
    const existing = this.columnValueFilters[columnKey];
    this.popupSelectedValues = existing ? new Set<string>(existing) : new Set<string>(this.popupAllValues);
    this.showFilterPopup = true;
  }
  closeFilterPopup(event?: MouseEvent): void {
    if (event && (event.target as HTMLElement).classList.contains('filter-popup-overlay')) {
      this.showFilterPopup = false; this.activeFilterColumnKey = null; this.filterPopupSearchText = ''; return;
    }
    if (!event) { this.showFilterPopup = false; this.activeFilterColumnKey = null; this.filterPopupSearchText = ''; }
  }
  getFilterValuesForActiveColumn(): string[] {
    if (!this.activeFilterColumnKey) return [];
    const all = this.popupAllValues;
    if (!this.filterPopupSearchText.trim()) return all;
    const q = this.filterPopupSearchText.toLowerCase();
    return all.filter(x => x.toLowerCase().includes(q));
  }
  clearActiveColumnFilter(): void { if (!this.activeFilterColumnKey) return; delete this.columnValueFilters[this.activeFilterColumnKey]; this.loadClaimNotes(1, this.pageSize); }
  isPopupAllSelected(): boolean { return this.popupAllValues.length > 0 && this.popupSelectedValues.size === this.popupAllValues.length; }
  onPopupAllChange(event: Event): void {
    const checked = (event.target as HTMLInputElement | null)?.checked ?? false;
    this.popupSelectedValues = checked ? new Set<string>(this.popupAllValues) : new Set<string>();
  }
  isPopupValueChecked(value: string): boolean { return this.popupSelectedValues.has(value); }
  onPopupValueChange(value: string, event: Event): void {
    const checked = (event.target as HTMLInputElement | null)?.checked ?? false;
    if (checked) this.popupSelectedValues.add(value); else this.popupSelectedValues.delete(value);
  }
  applyValueFilterAndClose(): void {
    if (this.activeFilterColumnKey) {
      const key = this.activeFilterColumnKey;
      if (this.popupSelectedValues.size === 0) { this.columnValueFilters[key] = new Set<string>(); }
      else if (this.popupSelectedValues.size === this.popupAllValues.length) { delete this.columnValueFilters[key]; }
      else { this.columnValueFilters[key] = new Set<string>(this.popupSelectedValues); }
    }
    this.loadClaimNotes(1, this.pageSize);
    this.closeFilterPopup();
  }
  private getAllUniqueValuesForColumn(columnKey: string): string[] {
    const uniq = new Set<string>();
    for (const note of this.claimNotes) {
      const v = this.getCellValue(note, columnKey);
      const s = (v ?? '').toString().trim();
      uniq.add(s === '' ? '(Blank)' : s);
    }
    const all = Array.from(uniq);
    all.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    return all;
  }

  /** Apply columnValueFilters to the notes (client-side filtering when API doesn't support value filters) */
  private applyValueFilters(notes: ClaimNoteListItem[]): ClaimNoteListItem[] {
    const keys = Object.keys(this.columnValueFilters || {});
    if (keys.length === 0) return notes;
    return notes.filter(note => {
      for (const key of keys) {
        const selected = this.columnValueFilters[key];
        if (!selected) continue;
        if (selected.size === 0) return false; // Explicit "match nothing" selection
        const v = this.getCellValue(note, key);
        const s = (v ?? '').toString().trim();
        const displayVal = s === '' ? '(Blank)' : s;
        if (!selected.has(displayVal)) return false;
      }
      return true;
    });
  }
  toggleCustomizationDialog(): void { this.showCustomizationDialog = !this.showCustomizationDialog; if (!this.showCustomizationDialog) { this.columnSearchText = ''; } }
  closeCustomizationDialog(event?: MouseEvent): void {
    if (event && (event.target as HTMLElement).classList.contains('customization-overlay')) {
      this.showCustomizationDialog = false; this.columnSearchText = '';
    } else if (!event) { this.showCustomizationDialog = false; this.columnSearchText = ''; }
  }
  toggleColumnVisibility(columnKey: string): void { const col = this.columns.find(c => c.key === columnKey); if (col) col.visible = !col.visible; }
  clearAllColumns(): void { this.columns.forEach(col => col.visible = false); }
  get filteredColumnsForDialog() {
    if (!this.columnSearchText.trim()) return this.columns;
    const searchLower = this.columnSearchText.toLowerCase();
    return this.columns.filter(col => col.label.toLowerCase().includes(searchLower) || col.key.toLowerCase().includes(searchLower));
  }

  getStandardColumns() {
    return this.filteredColumnsForDialog.filter(c => !c.isRelatedColumn);
  }

  toggleRelatedColumn(columnKey: string, label: string, table: string): void {
    const isSelected = this.isRelatedColumnSelected(columnKey);
    if (isSelected) {
      this.removeRelatedColumn(columnKey);
    } else {
      this.addRelatedColumn(columnKey, label, table);
    }
  }

  addRelatedColumn(columnKey: string, label: string, table: string): void {
    if (this.columns.some(c => c.key === columnKey)) {
      return;
    }
    this.selectedAdditionalColumns.add(columnKey);
    this.columns.push({
      key: columnKey,
      label: label,
      visible: true,
      filterValue: '',
      isRelatedColumn: true,
      table: table
    });
    this.loadClaimNotes(this.currentPage, this.pageSize);
  }

  removeRelatedColumn(columnKey: string): void {
    this.selectedAdditionalColumns.delete(columnKey);
    const index = this.columns.findIndex(c => c.key === columnKey);
    if (index >= 0) {
      this.columns.splice(index, 1);
    }
    this.loadClaimNotes(this.currentPage, this.pageSize);
  }

  getRelatedColumnsByTable(): { [table: string]: Array<{ table: string; key: string; label: string; path: string }> } {
    let cols = this.availableRelatedColumns;
    if (this.columnSearchText.trim()) {
      const q = this.columnSearchText.toLowerCase();
      cols = cols.filter(c =>
        (c.label && c.label.toLowerCase().includes(q)) ||
        (c.key && c.key.toLowerCase().includes(q)) ||
        (c.table && c.table.toLowerCase().includes(q))
      );
    }
    const grouped: { [table: string]: Array<{ table: string; key: string; label: string; path: string }> } = {};
    cols.forEach(col => {
      if (!grouped[col.table]) grouped[col.table] = [];
      grouped[col.table].push(col);
    });
    return grouped;
  }

  isRelatedColumnSelected(columnKey: string): boolean {
    return this.selectedAdditionalColumns.has(columnKey);
  }

  onRelatedColumnToggle(columnKey: string, label: string, table: string, event: Event): void {
    event.stopPropagation();
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.addRelatedColumn(columnKey, label, table);
    } else {
      this.removeRelatedColumn(columnKey);
    }
  }
}
