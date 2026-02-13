import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { DisbursementApiService } from '../../core/services/disbursement-api.service';
import { DisbursementListItem, DisbursementsApiResponse, PaginationMeta } from '../../core/services/disbursement.models';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-disbursement-list',
  templateUrl: './disbursement-list.component.html',
  styleUrls: ['./disbursement-list.component.css']
})
export class DisbursementListComponent implements OnInit, OnDestroy {
  disbursements: DisbursementListItem[] = [];
  filteredDisbursements: DisbursementListItem[] = [];
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

  columns: Array<{
    key: string;
    label: string;
    visible: boolean;
    filterValue: string;
    isRelatedColumn?: boolean;
    table?: string;
  }> = [
    { key: 'disbID', label: 'Disbursement ID', visible: true, filterValue: '' },
    { key: 'disbDateTimeCreated', label: 'Date Created', visible: true, filterValue: '' },
    { key: 'disbAmount', label: 'Amount', visible: true, filterValue: '' },
    { key: 'disbPmtFID', label: 'Payment ID', visible: true, filterValue: '' },
    { key: 'disbSrvFID', label: 'Service ID', visible: true, filterValue: '' },
    { key: 'disbCode', label: 'Code', visible: false, filterValue: '' },
    { key: 'disbNote', label: 'Note', visible: false, filterValue: '' },
    { key: 'disbDateTimeModified', label: 'Date Modified', visible: false, filterValue: '' },
    { key: 'disbCreatedUserGUID', label: 'Created User GUID', visible: false, filterValue: '' },
    { key: 'disbLastUserGUID', label: 'Last User GUID', visible: false, filterValue: '' },
    { key: 'disbCreatedUserName', label: 'Created User Name', visible: false, filterValue: '' },
    { key: 'disbLastUserName', label: 'Last User Name', visible: false, filterValue: '' },
    { key: 'disbCreatedComputerName', label: 'Created Computer Name', visible: false, filterValue: '' },
    { key: 'disbLastComputerName', label: 'Last Computer Name', visible: false, filterValue: '' },
    { key: 'disbBatchOperationReference', label: 'Batch Operation Reference', visible: false, filterValue: '' },
    { key: 'disbSrvGUID', label: 'Service GUID', visible: false, filterValue: '' }
  ];

  constructor(
    private disbursementApiService: DisbursementApiService,
    private router: Router
  ) { }

  currentPage: number = 1;
  pageSize: number = 25;

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.loadAvailableColumns();
    this.loadDisbursements(this.currentPage, this.pageSize);
  }

  loadAvailableColumns(): void {
    this.disbursementApiService.getAvailableColumns()
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

  loadDisbursements(page: number, pageSize: number): void {
    this.loading = true;
    this.error = null;
    this.currentPage = page;

    const filters: any = {};

    const textFilters = this.columns
      .filter(c => c.filterValue && c.filterValue.toString().trim() !== '')
      .map(c => c.filterValue.toString().trim())
      .join(' ');
    
    if (textFilters) {
      filters.searchText = textFilters;
    }

    // Add selected additional columns
    if (this.selectedAdditionalColumns.size > 0) {
      filters.additionalColumns = Array.from(this.selectedAdditionalColumns);
    }

    this.disbursementApiService.getDisbursements(page, pageSize, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: DisbursementsApiResponse) => {
          this.disbursements = response.data || [];
          this.filteredDisbursements = this.disbursements;
          this.meta = response.meta;
          this.loading = false;
          this.error = null;
        },
        error: (err) => {
          if (err.status === 0) {
            console.warn('Request cancelled or network error (likely due to navigation):', err);
          } else {
            this.error = 'Failed to load disbursements. Please check if the backend is running.';
            console.error('Error loading disbursements:', err);
          }
          this.loading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onPageChange(page: number): void {
    this.loadDisbursements(page, this.pageSize);
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize = pageSize;
    this.loadDisbursements(1, pageSize);
  }

  onRowClick(disbursement: DisbursementListItem): void {
    // Navigate to disbursement details if needed
  }

  getTotalPages(): number {
    if (!this.meta) return 0;
    return Math.ceil(this.meta.totalCount / this.meta.pageSize);
  }

  get visibleColumns() {
    return this.columns.filter(c => c.visible);
  }

  hideColumn(columnKey: string): void {
    const col = this.columns.find(c => c.key === columnKey);
    if (col) col.visible = false;
  }

  showColumn(columnKey: string): void {
    const col = this.columns.find(c => c.key === columnKey);
    if (col) col.visible = true;
  }

  onFilterChange(): void {
    this.loadDisbursements(1, this.pageSize);
  }

  clearFilter(columnKey: string, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    const col = this.columns.find(c => c.key === columnKey);
    if (col) {
      col.filterValue = '';
      delete this.columnValueFilters[columnKey];
      this.loadDisbursements(1, this.pageSize);
    }
  }

  getCellValue(disbursement: DisbursementListItem, key: string): any {
    const columnDefinition = this.columns.find(c => c.key === key);
    if (columnDefinition?.isRelatedColumn && disbursement.additionalColumns) {
      return disbursement.additionalColumns[key];
    }
    return (disbursement as any)[key];
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
    this.popupSelectedValues = existing
      ? new Set<string>(existing)
      : new Set<string>(this.popupAllValues);
    this.showFilterPopup = true;
  }

  closeFilterPopup(event?: MouseEvent): void {
    if (event && (event.target as HTMLElement).classList.contains('filter-popup-overlay')) {
      this.showFilterPopup = false;
      this.activeFilterColumnKey = null;
      this.filterPopupSearchText = '';
      return;
    }
    if (!event) {
      this.showFilterPopup = false;
      this.activeFilterColumnKey = null;
      this.filterPopupSearchText = '';
    }
  }

  getFilterValuesForActiveColumn(): string[] {
    if (!this.activeFilterColumnKey) return [];
    const all = this.popupAllValues;
    if (!this.filterPopupSearchText.trim()) return all;
    const q = this.filterPopupSearchText.toLowerCase();
    return all.filter(x => x.toLowerCase().includes(q));
  }

  clearActiveColumnFilter(): void {
    if (!this.activeFilterColumnKey) return;
    delete this.columnValueFilters[this.activeFilterColumnKey];
    this.loadDisbursements(1, this.pageSize);
  }

  isPopupAllSelected(): boolean {
    return this.popupAllValues.length > 0 && this.popupSelectedValues.size === this.popupAllValues.length;
  }

  onPopupAllChange(event: Event): void {
    const checked = (event.target as HTMLInputElement | null)?.checked ?? false;
    this.popupSelectedValues = checked
      ? new Set<string>(this.popupAllValues)
      : new Set<string>();
  }

  isPopupValueChecked(value: string): boolean {
    return this.popupSelectedValues.has(value);
  }

  onPopupValueChange(value: string, event: Event): void {
    const checked = (event.target as HTMLInputElement | null)?.checked ?? false;
    if (checked) this.popupSelectedValues.add(value);
    else this.popupSelectedValues.delete(value);
  }

  applyValueFilterAndClose(): void {
    if (this.activeFilterColumnKey) {
      const key = this.activeFilterColumnKey;
      if (this.popupSelectedValues.size === 0) {
        this.columnValueFilters[key] = new Set<string>();
      } else if (this.popupSelectedValues.size === this.popupAllValues.length) {
        delete this.columnValueFilters[key];
      } else {
        this.columnValueFilters[key] = new Set<string>(this.popupSelectedValues);
      }
    }
    this.loadDisbursements(1, this.pageSize);
    this.closeFilterPopup();
  }

  private getAllUniqueValuesForColumn(columnKey: string): string[] {
    const uniq = new Set<string>();
    for (const disbursement of this.disbursements) {
      const v = this.getCellValue(disbursement, columnKey);
      const s = (v ?? '').toString().trim();
      uniq.add(s === '' ? '(Blank)' : s);
    }
    const all = Array.from(uniq);
    all.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    return all;
  }

  toggleCustomizationDialog(): void {
    this.showCustomizationDialog = !this.showCustomizationDialog;
    if (!this.showCustomizationDialog) {
      this.columnSearchText = '';
    }
  }

  closeCustomizationDialog(event?: MouseEvent): void {
    if (event && (event.target as HTMLElement).classList.contains('customization-overlay')) {
      this.showCustomizationDialog = false;
      this.columnSearchText = '';
    } else if (!event) {
      this.showCustomizationDialog = false;
      this.columnSearchText = '';
    }
  }

  toggleColumnVisibility(columnKey: string): void {
    const col = this.columns.find(c => c.key === columnKey);
    if (col) col.visible = !col.visible;
  }

  clearAllColumns(): void {
    this.columns.forEach(col => col.visible = false);
  }

  get filteredColumnsForDialog() {
    if (!this.columnSearchText.trim()) {
      return this.columns;
    }
    const searchLower = this.columnSearchText.toLowerCase();
    return this.columns.filter(col => 
      col.label.toLowerCase().includes(searchLower) || 
      col.key.toLowerCase().includes(searchLower)
    );
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
    this.loadDisbursements(this.currentPage, this.pageSize);
  }

  removeRelatedColumn(columnKey: string): void {
    this.selectedAdditionalColumns.delete(columnKey);
    const index = this.columns.findIndex(c => c.key === columnKey);
    if (index >= 0) {
      this.columns.splice(index, 1);
    }
    this.loadDisbursements(this.currentPage, this.pageSize);
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
