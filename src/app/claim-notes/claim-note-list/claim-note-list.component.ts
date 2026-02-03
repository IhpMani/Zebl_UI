import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ClaimNoteApiService } from '../../core/services/claim-note-api.service';
import { ClaimNoteListItem, ClaimNotesApiResponse, PaginationMeta } from '../../core/services/claim-note.models';
import { Subject, takeUntil } from 'rxjs';

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
  popupTextFilter: string = ''; // For text/numeric input filters

  // Related columns from other tables
  availableRelatedColumns: Array<{ table: string; key: string; label: string; path: string }> = [];
  selectedAdditionalColumns: Set<string> = new Set<string>();

  columns: Array<{ key: string; label: string; visible: boolean; filterValue: string; isRelatedColumn?: boolean; table?: string; }> = [
    { key: 'claID', label: 'Claim ID', visible: true, filterValue: '' },
    { key: 'claDateTimeCreated', label: 'Date Created', visible: true, filterValue: '' },
    { key: 'claStatus', label: 'Status', visible: true, filterValue: '' },
    { key: 'claEDINotes', label: 'EDI Notes', visible: true, filterValue: '' },
    { key: 'claRemarks', label: 'Remarks', visible: true, filterValue: '' }
  ];

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
        if (response) {
          const columns = response.data || response;
          if (Array.isArray(columns) && columns.length > 0) {
            this.availableRelatedColumns = columns;
            this.availableRelatedColumns.forEach(col => {
              if (this.selectedAdditionalColumns.has(col.key)) {
                this.columns.push({
                  key: col.key,
                  label: col.label,
                  visible: true,
                  filterValue: '',
                  isRelatedColumn: true,
                  table: col.table
                });
              }
            });
          } else {
            this.availableRelatedColumns = [];
          }
        } else {
          this.availableRelatedColumns = [];
        }
      },
      error: (err) => {
        console.error('Error loading available columns:', err);
        this.availableRelatedColumns = [];
      }
    });
  }

  loadClaimNotes(page: number, pageSize: number): void {
    this.loading = true;
    this.error = null;
    this.currentPage = page;
    const filters: any = {};
    const textFilters = this.columns.filter(c => c.filterValue && c.filterValue.toString().trim() !== '').map(c => c.filterValue.toString().trim()).join(' ');
    if (textFilters) filters.searchText = textFilters;
    
    // Add selected additional columns
    if (this.selectedAdditionalColumns.size > 0) {
      filters.additionalColumns = Array.from(this.selectedAdditionalColumns);
    }
    
    this.claimNoteApiService.getClaimNotes(page, pageSize, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ClaimNotesApiResponse) => {
          this.claimNotes = response.data || [];
          this.filteredClaimNotes = this.claimNotes;
          this.meta = response.meta;
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
    const columnDefinition = this.columns.find(c => c.key === key);
    if (columnDefinition?.isRelatedColumn && note.additionalColumns) {
      return note.additionalColumns[key];
    }
    return (note as any)[key];
  }
  openFilterPopup(columnKey: string, event: MouseEvent): void {
    event.stopPropagation();
    this.activeFilterColumnKey = columnKey;
    this.filterPopupSearchText = '';
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.filterPopupPosition = { topPx: Math.round(rect.bottom + 6), leftPx: Math.round(rect.left) };
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
    const grouped: { [table: string]: Array<{ table: string; key: string; label: string; path: string }> } = {};
    this.availableRelatedColumns.forEach(col => {
      if (!grouped[col.table]) {
        grouped[col.table] = [];
      }
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
