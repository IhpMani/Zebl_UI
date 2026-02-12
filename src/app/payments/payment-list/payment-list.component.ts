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

  columns: Array<{ key: string; label: string; visible: boolean; filterValue: string; isRelatedColumn?: boolean; table?: string; }> = [
    { key: 'pmtID', label: 'Payment ID', visible: true, filterValue: '' },
    { key: 'pmtDateTimeCreated', label: 'Date Created', visible: true, filterValue: '' },
    { key: 'pmtDate', label: 'Payment Date', visible: true, filterValue: '' },
    { key: 'pmtAmount', label: 'Amount', visible: true, filterValue: '' },
    { key: 'pmtPatFID', label: 'Patient ID', visible: true, filterValue: '' },
    { key: 'pmtPayFID', label: 'Payer ID', visible: false, filterValue: '' },
    { key: 'pmtMethod', label: 'Method', visible: true, filterValue: '' },
    { key: 'pmt835Ref', label: '835 Ref', visible: false, filterValue: '' },
    { key: 'pmtDisbursedTRIG', label: 'Disbursed', visible: false, filterValue: '' },
    { key: 'pmtRemainingCC', label: 'Remaining', visible: true, filterValue: '' },
    { key: 'pmtBFEPFID', label: 'Billing/Entity Physician ID', visible: false, filterValue: '' },
    { key: 'pmtAuthCode', label: 'Auth Code', visible: false, filterValue: '' },
    { key: 'pmtNote', label: 'Note', visible: false, filterValue: '' },
    { key: 'pmtDateTimeModified', label: 'Date Modified', visible: false, filterValue: '' },
    { key: 'pmtCreatedUserGUID', label: 'Created User GUID', visible: false, filterValue: '' },
    { key: 'pmtLastUserGUID', label: 'Last User GUID', visible: false, filterValue: '' },
    { key: 'pmtCreatedUserName', label: 'Created User Name', visible: false, filterValue: '' },
    { key: 'pmtLastUserName', label: 'Last User Name', visible: false, filterValue: '' },
    { key: 'pmtCreatedComputerName', label: 'Created Computer Name', visible: false, filterValue: '' },
    { key: 'pmtLastComputerName', label: 'Last Computer Name', visible: false, filterValue: '' },
    { key: 'pmtBatchOperationReference', label: 'Batch Operation Reference', visible: false, filterValue: '' },
    { key: 'pmtOtherReference1', label: 'Other Reference 1', visible: false, filterValue: '' },
    { key: 'pmtOtherReference2', label: 'Other Reference 2', visible: false, filterValue: '' },
    { key: 'pmtCardEntryContext', label: 'Card Entry Context', visible: false, filterValue: '' },
    { key: 'pmtCardEntryMethod', label: 'Card Entry Method', visible: false, filterValue: '' },
    { key: 'pmtNameOnCard', label: 'Name On Card', visible: false, filterValue: '' },
    { key: 'pmtIssuerResponseCode', label: 'Issuer Response Code', visible: false, filterValue: '' },
    { key: 'pmtResponseCode', label: 'Response Code', visible: false, filterValue: '' },
    { key: 'pmtChargedPlatformFee', label: 'Charged Platform Fee', visible: false, filterValue: '' },
    { key: 'pmtTransactionType', label: 'Transaction Type', visible: false, filterValue: '' }
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
  onRowClick(payment: PaymentListItem): void { }
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
    this.filterPopupPosition = { topPx: Math.round(rect.bottom + 6), leftPx: Math.round(rect.left) };
    
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
