import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AdjustmentApiService } from '../../core/services/adjustment-api.service';
import { AdjustmentListItem, AdjustmentsApiResponse, PaginationMeta } from '../../core/services/adjustment.models';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-adjustment-list',
  templateUrl: './adjustment-list.component.html',
  styleUrls: ['./adjustment-list.component.css']
})
export class AdjustmentListComponent implements OnInit, OnDestroy {
  adjustments: AdjustmentListItem[] = [];
  filteredAdjustments: AdjustmentListItem[] = [];
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
    { key: 'adjID', label: 'Adjustment ID', visible: true, filterValue: '' },
    { key: 'adjDateTimeCreated', label: 'Date Created', visible: true, filterValue: '' },
    { key: 'adjDate', label: 'Adjustment Date', visible: true, filterValue: '' },
    { key: 'adjAmount', label: 'Amount', visible: true, filterValue: '' },
    { key: 'adjGroupCode', label: 'Group Code', visible: true, filterValue: '' },
    { key: 'adjReasonCode', label: 'Reason Code', visible: true, filterValue: '' },
    { key: 'adjSrvFID', label: 'Service ID', visible: true, filterValue: '' },
    { key: 'adjPmtFID', label: 'Payment ID', visible: false, filterValue: '' },
    { key: 'adjPayFID', label: 'Payer ID', visible: false, filterValue: '' },
    { key: 'adj835Ref', label: '835 Ref', visible: false, filterValue: '' }
  ];

  constructor(
    private adjustmentApiService: AdjustmentApiService,
    private router: Router
  ) { }

  currentPage: number = 1;
  pageSize: number = 25;

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.loadAvailableColumns();
    this.loadAdjustments(this.currentPage, this.pageSize);
  }

  loadAvailableColumns(): void {
    this.adjustmentApiService.getAvailableColumns()
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

  loadAdjustments(page: number, pageSize: number): void {
    this.loading = true;
    this.error = null;
    this.currentPage = page;

    const filters: any = {};

    if (this.columnValueFilters['adjGroupCode'] && this.columnValueFilters['adjGroupCode'].size > 0) {
      const groupCodes = Array.from(this.columnValueFilters['adjGroupCode']).filter(s => s !== '(Blank)');
      if (groupCodes.length > 0) {
        filters.groupCode = groupCodes[0]; // Single group code for now
      }
    }

    // Handle numeric filters for Adjustment ID
    if (this.columnValueFilters['adjID'] && this.columnValueFilters['adjID'].size > 0) {
      const adjustmentIdValues = Array.from(this.columnValueFilters['adjID']).filter(v => v !== '(Blank)');
      if (adjustmentIdValues.length > 0) {
        const adjustmentIds = adjustmentIdValues.map(v => parseInt(v, 10)).filter(id => !isNaN(id));
        if (adjustmentIds.length > 0) {
          if (adjustmentIds.length === 1) {
            filters.minAdjustmentId = adjustmentIds[0];
            filters.maxAdjustmentId = adjustmentIds[0];
          } else {
            filters.minAdjustmentId = Math.min(...adjustmentIds);
            filters.maxAdjustmentId = Math.max(...adjustmentIds);
          }
        }
      }
    }

    // Handle numeric filters for Amount
    if (this.columnValueFilters['adjAmount'] && this.columnValueFilters['adjAmount'].size > 0) {
      const amountValues = Array.from(this.columnValueFilters['adjAmount']).filter(v => v !== '(Blank)');
      const amounts = amountValues.map(v => parseFloat(v)).filter(a => !isNaN(a));
      if (amounts.length > 0) {
        filters.minAmount = Math.min(...amounts);
        filters.maxAmount = Math.max(...amounts);
      }
    }

    // Handle Service ID filter
    if (this.columnValueFilters['adjSrvFID'] && this.columnValueFilters['adjSrvFID'].size > 0) {
      const serviceIdValues = Array.from(this.columnValueFilters['adjSrvFID']).filter(v => v !== '(Blank)');
      const serviceIds = serviceIdValues.map(v => parseInt(v, 10)).filter(id => !isNaN(id));
      if (serviceIds.length > 0) {
        filters.serviceId = serviceIds[0];
      }
    }

    // Text search across columns (for non-numeric columns)
    const textFilterColumns = this.columns.filter(c => 
      c.filterValue && 
      c.filterValue.toString().trim() !== '' &&
      c.key !== 'adjID' &&
      c.key !== 'adjAmount' &&
      c.key !== 'adjSrvFID' &&
      c.key !== 'adjGroupCode' &&
      c.key !== 'adjPmtFID' &&
      c.key !== 'adjPayFID'
    );
    
    if (textFilterColumns.length > 0) {
      const textFilters = textFilterColumns
        .map(c => c.filterValue.toString().trim())
        .join(' ');
      if (textFilters) {
        filters.searchText = textFilters;
      }
    }

    // Add selected additional columns
    if (this.selectedAdditionalColumns.size > 0) {
      filters.additionalColumns = Array.from(this.selectedAdditionalColumns);
    }

    this.adjustmentApiService.getAdjustments(page, pageSize, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: AdjustmentsApiResponse) => {
          this.adjustments = response.data || [];
          this.filteredAdjustments = this.adjustments;
          this.meta = response.meta;
          this.loading = false;
          this.error = null;
        },
        error: (err) => {
          if (err.status === 0) {
            console.warn('Request cancelled or network error (likely due to navigation):', err);
          } else {
            this.error = 'Failed to load adjustments. Please check if the backend is running.';
            console.error('Error loading adjustments:', err);
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
    this.loadAdjustments(page, this.pageSize);
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize = pageSize;
    this.loadAdjustments(1, pageSize);
  }

  onRowClick(adjustment: AdjustmentListItem): void {
    // Navigate to adjustment details if needed
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
    this.loadAdjustments(1, this.pageSize);
  }

  clearFilter(columnKey: string, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    const col = this.columns.find(c => c.key === columnKey);
    if (col) {
      col.filterValue = '';
      delete this.columnValueFilters[columnKey];
      this.loadAdjustments(1, this.pageSize);
    }
  }

  getCellValue(adjustment: AdjustmentListItem, key: string): any {
    const columnDefinition = this.columns.find(c => c.key === key);
    if (columnDefinition?.isRelatedColumn && adjustment.additionalColumns) {
      return adjustment.additionalColumns[key];
    }
    return (adjustment as any)[key];
  }

  openFilterPopup(columnKey: string, event: MouseEvent): void {
    event.stopPropagation();
    this.activeFilterColumnKey = columnKey;
    this.filterPopupSearchText = '';
    this.popupTextFilter = '';
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.filterPopupPosition = {
      topPx: Math.round(rect.bottom + 6),
      leftPx: Math.round(rect.left)
    };
    
    const isNumeric = this.isNumericColumn(columnKey);
    
    if (isNumeric) {
      const existing = this.columnValueFilters[columnKey];
      if (existing && existing.size > 0) {
        const values = Array.from(existing).filter(v => v !== '(Blank)');
        this.popupTextFilter = values.join(', ');
      }
    } else {
      this.popupAllValues = this.getAllUniqueValuesForColumn(columnKey);
      const existing = this.columnValueFilters[columnKey];
      this.popupSelectedValues = existing
        ? new Set<string>(existing)
        : new Set<string>(this.popupAllValues);
    }
    this.showFilterPopup = true;
  }

  isNumericColumn(columnKey: string): boolean {
    const numericColumns = ['adjID', 'adjAmount', 'adjSrvFID', 'adjPmtFID', 'adjPayFID'];
    return numericColumns.includes(columnKey);
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
    this.popupTextFilter = '';
    this.loadAdjustments(1, this.pageSize);
  }

  getColumnLabel(columnKey: string): string {
    const col = this.columns.find(c => c.key === columnKey);
    return col ? col.label : columnKey;
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
      const isNumeric = this.isNumericColumn(key);

      if (isNumeric) {
        const textValue = this.popupTextFilter.trim();
        if (textValue) {
          const values = textValue.split(',').map(v => v.trim()).filter(v => v);
          if (values.length > 0) {
            this.columnValueFilters[key] = new Set<string>(values);
          } else {
            delete this.columnValueFilters[key];
          }
        } else {
          delete this.columnValueFilters[key];
        }
      } else {
        if (this.popupSelectedValues.size === 0) {
          this.columnValueFilters[key] = new Set<string>();
        } else if (this.popupSelectedValues.size === this.popupAllValues.length) {
          delete this.columnValueFilters[key];
        } else {
          this.columnValueFilters[key] = new Set<string>(this.popupSelectedValues);
        }
      }
    }
    this.loadAdjustments(1, this.pageSize);
    this.closeFilterPopup();
  }

  private getAllUniqueValuesForColumn(columnKey: string): string[] {
    const uniq = new Set<string>();
    for (const adjustment of this.adjustments) {
      const v = this.getCellValue(adjustment, columnKey);
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
    this.loadAdjustments(this.currentPage, this.pageSize);
  }

  removeRelatedColumn(columnKey: string): void {
    this.selectedAdditionalColumns.delete(columnKey);
    const index = this.columns.findIndex(c => c.key === columnKey);
    if (index >= 0) {
      this.columns.splice(index, 1);
    }
    this.loadAdjustments(this.currentPage, this.pageSize);
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
