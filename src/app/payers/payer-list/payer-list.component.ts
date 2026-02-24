import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { PayerApiService } from '../../core/services/payer-api.service';
import { PayerListItem, PayersApiResponse, PaginationMeta } from '../../core/services/payer.models';
import { ListApiService } from '../../core/services/list-api.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-payer-list',
  templateUrl: './payer-list.component.html',
  styleUrls: ['./payer-list.component.css']
})
export class PayerListComponent implements OnInit, OnDestroy {
  payers: PayerListItem[] = [];
  filteredPayers: PayerListItem[] = [];
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
    { key: 'payID', label: 'Payer ID', visible: true, filterValue: '' },
    { key: 'payDateTimeCreated', label: 'Date Created', visible: true, filterValue: '' },
    { key: 'payName', label: 'Payer Name', visible: true, filterValue: '' },
    { key: 'payExternalID', label: 'External ID', visible: false, filterValue: '' },
    { key: 'payCity', label: 'City', visible: false, filterValue: '' },
    { key: 'payState', label: 'State', visible: false, filterValue: '' },
    { key: 'payPhoneNo', label: 'Phone', visible: false, filterValue: '' },
    { key: 'payInactive', label: 'Inactive', visible: true, filterValue: '' },
    { key: 'payClaimType', label: 'Claim Type', visible: true, filterValue: '' },
    { key: 'paySubmissionMethod', label: 'Submission Method', visible: false, filterValue: '' },
    { key: 'payClassification', label: 'Classification', visible: false, filterValue: '' },
    { key: 'payAddr1', label: 'Address', visible: false, filterValue: '' },
    { key: 'payZip', label: 'ZIP', visible: false, filterValue: '' },
    { key: 'payEmail', label: 'Email', visible: false, filterValue: '' },
    { key: 'payDateTimeModified', label: 'Date Modified', visible: false, filterValue: '' },
    { key: 'payCreatedUserGUID', label: 'Created User GUID', visible: false, filterValue: '' },
    { key: 'payLastUserGUID', label: 'Last User GUID', visible: false, filterValue: '' },
    { key: 'payCreatedUserName', label: 'Created User Name', visible: false, filterValue: '' },
    { key: 'payLastUserName', label: 'Last User Name', visible: false, filterValue: '' },
    { key: 'payCreatedComputerName', label: 'Created Computer Name', visible: false, filterValue: '' },
    { key: 'payLastComputerName', label: 'Last Computer Name', visible: false, filterValue: '' },
    { key: 'payAddr2', label: 'Address 2', visible: false, filterValue: '' },
    { key: 'payAlwaysExportSupervisingProvider', label: 'Always Export Supervising Provider', visible: false, filterValue: '' },
    { key: 'payBox1', label: 'Box 1', visible: false, filterValue: '' },
    { key: 'payClaimFilingIndicator', label: 'Claim Filing Indicator', visible: false, filterValue: '' },
    { key: 'payEligibilityPhyID', label: 'Eligibility Physician ID', visible: false, filterValue: '' },
    { key: 'payEligibilityPayerID', label: 'Eligibility Payer ID', visible: false, filterValue: '' },
    { key: 'payExportAuthIn2400', label: 'Export Auth In 2400', visible: false, filterValue: '' },
    { key: 'payExportBillingTaxonomy', label: 'Export Billing Taxonomy', visible: false, filterValue: '' },
    { key: 'payExportOtherPayerOfficeNumber2330B', label: 'Export Other Payer Office Number 2330B', visible: false, filterValue: '' },
    { key: 'payExportOriginalRefIn2330B', label: 'Export Original Ref In 2330B', visible: false, filterValue: '' },
    { key: 'payExportPatientAmtDueIn2430', label: 'Export Patient Amt Due In 2430', visible: false, filterValue: '' },
    { key: 'payExportPatientForPOS12', label: 'Export Patient For POS 12', visible: false, filterValue: '' },
    { key: 'payExportPaymentDateIn2330B', label: 'Export Payment Date In 2330B', visible: false, filterValue: '' },
    { key: 'payExportSSN', label: 'Export SSN', visible: false, filterValue: '' },
    { key: 'payFaxNo', label: 'Fax No', visible: false, filterValue: '' },
    { key: 'payFollowUpDays', label: 'Follow Up Days', visible: false, filterValue: '' },
    { key: 'payForwardsClaims', label: 'Forwards Claims', visible: false, filterValue: '' },
    { key: 'payICDIndicator', label: 'ICD Indicator', visible: false, filterValue: '' },
    { key: 'payIgnoreRenderingProvider', label: 'Ignore Rendering Provider', visible: false, filterValue: '' },
    { key: 'payInsTypeCode', label: 'Ins Type Code', visible: false, filterValue: '' },
    { key: 'payNotes', label: 'Notes', visible: false, filterValue: '' },
    { key: 'payOfficeNumber', label: 'Office Number', visible: false, filterValue: '' },
    { key: 'payPaymentMatchingKey', label: 'Payment Matching Key', visible: false, filterValue: '' },
    { key: 'payPrintBox30', label: 'Print Box 30', visible: false, filterValue: '' },
    { key: 'payFormatDateBox14And15', label: 'Format Date Box 14 And 15', visible: false, filterValue: '' },
    { key: 'paySuppressWhenPrinting', label: 'Suppress When Printing', visible: false, filterValue: '' },
    { key: 'payTotalUndisbursedPaymentsTRIG', label: 'Total Undisbursed Payments TRIG', visible: false, filterValue: '' },
    { key: 'payExportTrackedPRAdjs', label: 'Export Tracked PR Adjs', visible: false, filterValue: '' },
    { key: 'payUseTotalAppliedInBox29', label: 'Use Total Applied In Box 29', visible: false, filterValue: '' },
    { key: 'payWebsite', label: 'Website', visible: false, filterValue: '' },
    { key: 'payNameWithInactiveCC', label: 'Name With Inactive CC', visible: false, filterValue: '' },
    { key: 'payCityStateZipCC', label: 'City State Zip CC', visible: false, filterValue: '' }
  ];

  constructor(
    private payerApiService: PayerApiService,
    private listApiService: ListApiService,
    private router: Router
  ) { }

  currentPage: number = 1;
  pageSize: number = 25;

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.loadAvailableColumns();
    this.loadPayers(this.currentPage, this.pageSize);
  }

  loadAvailableColumns(): void {
    this.payerApiService.getAvailableColumns()
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

  loadPayers(page: number, pageSize: number): void {
    this.loading = true;
    this.error = null;
    this.currentPage = page;

    const filters: any = {};

    if (this.columnValueFilters['payInactive'] && this.columnValueFilters['payInactive'].size > 0) {
      const inactiveSet = this.columnValueFilters['payInactive'];
      const inactiveArray = Array.from(inactiveSet).filter(s => s !== '(Blank)');
      if (inactiveArray.length === 1) {
        filters.inactive = inactiveArray[0] === 'true';
      }
    }

    if (this.columnValueFilters['payClassification'] && this.columnValueFilters['payClassification'].size > 0) {
      const vals = Array.from(this.columnValueFilters['payClassification']).filter(s => s !== '(Blank)');
      if (vals.length > 0) {
        filters.classificationList = vals.join(',');
      }
    }

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

    this.payerApiService.getPayers(page, pageSize, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PayersApiResponse) => {
          this.payers = response.data || [];
          this.filteredPayers = this.payers;
          this.meta = {
            page,
            pageSize,
            totalCount: response.totalCount ?? 0
          };
          this.loading = false;
          this.error = null;
        },
        error: (err) => {
          if (err.status === 0) {
            console.warn('Request cancelled or network error (likely due to navigation):', err);
          } else {
            this.error = 'Failed to load payers. Please check if the backend is running.';
            console.error('Error loading payers:', err);
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
    this.loadPayers(page, this.pageSize);
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize = pageSize;
    this.loadPayers(1, pageSize);
  }

  onRowClick(payer: PayerListItem): void {
    // Navigate to payer details if needed
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
    this.loadPayers(1, this.pageSize);
  }

  clearFilter(columnKey: string, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    const col = this.columns.find(c => c.key === columnKey);
    if (col) {
      col.filterValue = '';
      delete this.columnValueFilters[columnKey];
      this.loadPayers(1, this.pageSize);
    }
  }

  getCellValue(payer: PayerListItem, key: string): any {
    const columnDefinition = this.columns.find(c => c.key === key);
    if (columnDefinition?.isRelatedColumn && payer.additionalColumns) {
      return payer.additionalColumns[key];
    }
    return (payer as any)[key];
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

    if (columnKey === 'payClassification') {
      // Classification: values from List Library "Payer Classification" (linked to Payer.PayClassification)
      const fromPayers = this.getAllUniqueValuesForColumn(columnKey);
      this.listApiService.getListValues('Payer Classification')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            const fromList = (res.data || []).map(v => v.value?.trim()).filter(Boolean) || [];
            const merged = [...new Set([...fromList, ...fromPayers])];
            merged.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
            this.popupAllValues = merged;
            const existing = this.columnValueFilters[columnKey];
            this.popupSelectedValues = existing ? new Set<string>(existing) : new Set<string>(this.popupAllValues);
            this.showFilterPopup = true;
          },
          error: () => {
            this.popupAllValues = fromPayers;
            const existing = this.columnValueFilters[columnKey];
            this.popupSelectedValues = existing ? new Set<string>(existing) : new Set<string>(this.popupAllValues);
            this.showFilterPopup = true;
          }
        });
    } else {
      this.popupAllValues = this.getAllUniqueValuesForColumn(columnKey);
      const existing = this.columnValueFilters[columnKey];
      this.popupSelectedValues = existing
        ? new Set<string>(existing)
        : new Set<string>(this.popupAllValues);
      this.showFilterPopup = true;
    }
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
    this.loadPayers(1, this.pageSize);
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
    this.loadPayers(1, this.pageSize);
    this.closeFilterPopup();
  }

  private getAllUniqueValuesForColumn(columnKey: string): string[] {
    const uniq = new Set<string>();
    for (const payer of this.payers) {
      const v = this.getCellValue(payer, columnKey);
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
    this.loadPayers(this.currentPage, this.pageSize);
  }

  removeRelatedColumn(columnKey: string): void {
    this.selectedAdditionalColumns.delete(columnKey);
    const index = this.columns.findIndex(c => c.key === columnKey);
    if (index >= 0) {
      this.columns.splice(index, 1);
    }
    this.loadPayers(this.currentPage, this.pageSize);
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
