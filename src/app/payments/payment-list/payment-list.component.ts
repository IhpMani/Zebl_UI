import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { PaymentApiService } from '../../core/services/payment-api.service';
import { PaymentListItem, PaymentsApiResponse, PaginationMeta } from '../../core/services/payment.models';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-payment-list',
  templateUrl: './payment-list.component.html',
  styleUrls: ['./payment-list.component.css']
})
export class PaymentListComponent implements OnInit, OnDestroy {
  payments: PaymentListItem[] = [];
  filteredPayments: PaymentListItem[] = [];
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

  /** Only these columns, in this order (per user request). */
  columns: Array<{ key: string; label: string; visible: boolean; filterValue: string; isRelatedColumn?: boolean; table?: string; }> = [
    { key: 'patAccountNo', label: 'Account #', visible: true, filterValue: '' },
    { key: 'pmtOtherReference1', label: 'Addl Ref #', visible: true, filterValue: '' },
    { key: 'pmtAmount', label: 'Amount', visible: true, filterValue: '' },
    { key: 'pmtChargedPlatformFee', label: 'Charged Platform Fee', visible: true, filterValue: '' },
    { key: 'pmtDateTimeCreated', label: 'Created Timestamp', visible: true, filterValue: '' },
    { key: 'pmtCreatedUserName', label: 'Created User', visible: true, filterValue: '' },
    { key: 'pmtLastUserName', label: 'Modified User', visible: true, filterValue: '' },
    { key: 'pmtRemainingCC', label: 'Remaining Bal', visible: true, filterValue: '' },
    { key: 'pmtSource', label: 'Source', visible: true, filterValue: '' },
    { key: 'patLastName', label: 'Last Name', visible: true, filterValue: '' },
    { key: 'patFirstName', label: 'First Name', visible: true, filterValue: '' },
    { key: 'pmtMethod', label: 'Method', visible: true, filterValue: '' },
    { key: 'pmtPayerName', label: 'Payer Name', visible: true, filterValue: '' },
    { key: 'pmtDateTimeModified', label: 'Modified Timestamp', visible: true, filterValue: '' },
    { key: 'pmtID', label: 'Payment ID', visible: true, filterValue: '' },
    { key: 'payClassification', label: 'Pay Classification', visible: true, filterValue: '' },
    { key: 'pmtDate', label: 'Pmt Date', visible: true, filterValue: '' },
    { key: 'patFullNameCC', label: 'Name', visible: true, filterValue: '' },
    { key: 'pmtNote', label: 'Note', visible: true, filterValue: '' },
    { key: 'patClassification', label: 'Pat Classification', visible: true, filterValue: '' },
    { key: 'pmtPatFID', label: 'Patient ID', visible: true, filterValue: '' },
    { key: 'pmt835Ref', label: 'Ref #', visible: true, filterValue: '' },
  ];

  constructor(private paymentApiService: PaymentApiService, private router: Router) { }
  currentPage: number = 1;
  pageSize: number = 25;

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.loadAvailableColumns();
    this.loadPayments(this.currentPage, this.pageSize);
  }

  loadAvailableColumns(): void {
    this.paymentApiService.getAvailableColumns()
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

  loadPayments(page: number, pageSize: number): void {
    this.loading = true;
    this.error = null;
    this.currentPage = page;
    const filters: any = {};

    // Handle numeric filters for Payment ID
    if (this.columnValueFilters['pmtID'] && this.columnValueFilters['pmtID'].size > 0) {
      const paymentIdValues = Array.from(this.columnValueFilters['pmtID']).filter(v => v !== '(Blank)');
      if (paymentIdValues.length > 0) {
        const paymentIds = paymentIdValues.map(v => parseInt(v, 10)).filter(id => !isNaN(id));
        if (paymentIds.length > 0) {
          if (paymentIds.length === 1) {
            filters.minPaymentId = paymentIds[0];
            filters.maxPaymentId = paymentIds[0];
          } else {
            filters.minPaymentId = Math.min(...paymentIds);
            filters.maxPaymentId = Math.max(...paymentIds);
          }
        }
      }
    }

    // Handle numeric filters for Amount
    if (this.columnValueFilters['pmtAmount'] && this.columnValueFilters['pmtAmount'].size > 0) {
      const amountValues = Array.from(this.columnValueFilters['pmtAmount']).filter(v => v !== '(Blank)');
      const amounts = amountValues.map(v => parseFloat(v)).filter(a => !isNaN(a));
      if (amounts.length > 0) {
        filters.minAmount = Math.min(...amounts);
        filters.maxAmount = Math.max(...amounts);
      }
    }

    // Handle Patient ID filter
    if (this.columnValueFilters['pmtPatFID'] && this.columnValueFilters['pmtPatFID'].size > 0) {
      const patientIdValues = Array.from(this.columnValueFilters['pmtPatFID']).filter(v => v !== '(Blank)');
      const patientIds = patientIdValues.map(v => parseInt(v, 10)).filter(id => !isNaN(id));
      if (patientIds.length > 0) {
        filters.patientId = patientIds[0];
      }
    }

    // Text search across columns (for non-numeric columns)
    const textFilterColumns = this.columns.filter(c => 
      c.filterValue && 
      c.filterValue.toString().trim() !== '' &&
      c.key !== 'pmtID' &&
      c.key !== 'pmtAmount' &&
      c.key !== 'pmtPatFID' &&
      c.key !== 'pmtPayFID'
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
    
    this.paymentApiService.getPayments(page, pageSize, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaymentsApiResponse) => {
          this.payments = response.data || [];
          this.filteredPayments = this.payments;
          this.meta = response.meta;
          this.loading = false;
          this.error = null;
        },
        error: (err) => {
          if (err.status === 0) {
            console.warn('Request cancelled or network error (likely due to navigation):', err);
          } else {
            this.error = 'Failed to load payments. Please check if the backend is running.';
            console.error('Error loading payments:', err);
          }
          this.loading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onPageChange(page: number): void { this.loadPayments(page, this.pageSize); }
  onPageSizeChange(pageSize: number): void { this.pageSize = pageSize; this.loadPayments(1, pageSize); }
  onRowClick(payment: PaymentListItem): void {
    this.router.navigate(['payments/entry', payment.pmtID]);
  }
  getTotalPages(): number { if (!this.meta) return 0; return Math.ceil(this.meta.totalCount / this.meta.pageSize); }
  get visibleColumns() { return this.columns.filter(c => c.visible); }
  hideColumn(columnKey: string): void { const col = this.columns.find(c => c.key === columnKey); if (col) col.visible = false; }
  showColumn(columnKey: string): void { const col = this.columns.find(c => c.key === columnKey); if (col) col.visible = true; }
  onFilterChange(): void { this.loadPayments(1, this.pageSize); }
  clearFilter(columnKey: string, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    const col = this.columns.find(c => c.key === columnKey);
    if (col) { col.filterValue = ''; delete this.columnValueFilters[columnKey]; this.loadPayments(1, this.pageSize); }
  }
  getCellValue(payment: PaymentListItem, key: string): any {
    if (key === 'pmtSource') return '';
    const columnDefinition = this.columns.find(c => c.key === key);
    if (columnDefinition?.isRelatedColumn && payment.additionalColumns) {
      return payment.additionalColumns[key];
    }
    return (payment as any)[key];
  }
  openFilterPopup(columnKey: string, event: MouseEvent): void {
    event.stopPropagation();
    this.activeFilterColumnKey = columnKey;
    this.filterPopupSearchText = '';
    this.popupTextFilter = '';
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const popupWidth = 260;
    const popupMaxHeight = Math.min(420, window.innerHeight - 24);
    let topPx = Math.round(rect.bottom + 6);
    if (topPx + popupMaxHeight > window.innerHeight) topPx = Math.max(8, window.innerHeight - popupMaxHeight);
    let leftPx = Math.round(rect.left);
    if (leftPx + popupWidth > window.innerWidth - 8) leftPx = Math.max(8, window.innerWidth - popupWidth - 8);
    this.filterPopupPosition = { topPx, leftPx };
    
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
      this.popupSelectedValues = existing ? new Set<string>(existing) : new Set<string>(this.popupAllValues);
    }
    this.showFilterPopup = true;
  }

  isNumericColumn(columnKey: string): boolean {
    const numericColumns = ['pmtID', 'pmtAmount', 'pmtPatFID', 'pmtPayFID', 'pmtRemainingCC', 'pmtBFEPFID'];
    return numericColumns.includes(columnKey);
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
  clearActiveColumnFilter(): void { 
    if (!this.activeFilterColumnKey) return; 
    delete this.columnValueFilters[this.activeFilterColumnKey]; 
    this.popupTextFilter = '';
    this.loadPayments(1, this.pageSize); 
  }

  getColumnLabel(columnKey: string): string {
    const col = this.columns.find(c => c.key === columnKey);
    return col ? col.label : columnKey;
  }
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
        if (this.popupSelectedValues.size === 0) { this.columnValueFilters[key] = new Set<string>(); }
        else if (this.popupSelectedValues.size === this.popupAllValues.length) { delete this.columnValueFilters[key]; }
        else { this.columnValueFilters[key] = new Set<string>(this.popupSelectedValues); }
      }
    }
    this.loadPayments(1, this.pageSize);
    this.closeFilterPopup();
  }
  private getAllUniqueValuesForColumn(columnKey: string): string[] {
    const uniq = new Set<string>();
    for (const payment of this.payments) {
      const v = this.getCellValue(payment, columnKey);
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
    this.loadPayments(this.currentPage, this.pageSize);
  }

  removeRelatedColumn(columnKey: string): void {
    this.selectedAdditionalColumns.delete(columnKey);
    const index = this.columns.findIndex(c => c.key === columnKey);
    if (index >= 0) {
      this.columns.splice(index, 1);
    }
    this.loadPayments(this.currentPage, this.pageSize);
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
