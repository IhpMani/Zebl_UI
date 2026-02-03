import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ClaimApiService } from '../../core/services/claim-api.service';
import { ClaimListItem, ClaimsApiResponse, PaginationMeta } from '../../core/services/claim.models';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-claim-list',
  templateUrl: './claim-list.component.html',
  styleUrls: ['./claim-list.component.css']
})
export class ClaimListComponent implements OnInit, OnDestroy {
  claims: ClaimListItem[] = [];
  filteredClaims: ClaimListItem[] = [];
  loading: boolean = false;
  error: string | null = null;
  meta: PaginationMeta | null = null;
  showCustomizationDialog: boolean = false;
  columnSearchText: string = '';

  // Filter popup state (Excel-like values list)
  showFilterPopup: boolean = false;
  activeFilterColumnKey: string | null = null;
  filterPopupSearchText: string = '';
  filterPopupPosition = { topPx: 0, leftPx: 0 };
  // columnKey -> selected string values (when set, filter is active)
  // If a key is missing, that column has no value-filter applied.
  columnValueFilters: Record<string, Set<string>> = {};

  // Popup working state (so selections only apply on "Apply")
  popupAllValues: string[] = [];
  popupSelectedValues: Set<string> = new Set<string>();
  popupTextFilter: string = ''; // For text/numeric input filters

  // Related columns from other tables
  availableRelatedColumns: Array<{ table: string; key: string; label: string; path: string }> = [];
  selectedAdditionalColumns: Set<string> = new Set<string>(); // Track which additional columns are selected

  columns: Array<{
    key: string;
    label: string;
    visible: boolean;
    filterValue: string;
    isRelatedColumn?: boolean; // Flag to identify related columns
    table?: string; // Which table this column comes from
  }> = [
    {
      key: 'claID',
      label: 'Claim ID',
      visible: true,
      filterValue: ''
    },
    {
      key: 'claStatus',
      label: 'Status',
      visible: true,
      filterValue: ''
    },
    {
      key: 'claDateTimeCreated',
      label: 'Date Created',
      visible: true,
      filterValue: ''
    },
    {
      key: 'claTotalChargeTRIG',
      label: 'Total Charge',
      visible: true,
      filterValue: ''
    },
    {
      key: 'claTotalBalanceCC',
      label: 'Total Balance',
      visible: true,
      filterValue: ''
    },
    {
      key: 'claClassification',
      label: 'Classification',
      visible: false,
      filterValue: ''
    },
    {
      key: 'claFirstDateTRIG',
      label: '1st DOS',
      visible: false,
      filterValue: ''
    },
    {
      key: 'claLastDateTRIG',
      label: 'Last DOS',
      visible: false,
      filterValue: ''
    },
    {
      key: 'claBillTo',
      label: 'Bill To',
      visible: false,
      filterValue: ''
    },
    {
      key: 'claDateTimeModified',
      label: 'Modified Timestamp',
      visible: false,
      filterValue: ''
    },
    {
      key: 'claLastUserName',
      label: 'Modified User',
      visible: false,
      filterValue: ''
    }
  ];

  constructor(
    private claimApiService: ClaimApiService,
    private router: Router
  ) { }

  currentPage: number = 1;
  pageSize: number = 25;

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    // Load available related columns
    this.loadAvailableColumns();
    // Load first page with server-side filtering
    this.loadClaims(this.currentPage, this.pageSize);
  }

  loadAvailableColumns(): void {
    console.log('Loading available columns...');
    this.claimApiService.getAvailableColumns()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (response: any) => {
        console.log('Available columns response:', response);
        if (response) {
          // Handle both direct array and wrapped in data property
          const columns = response.data || response;
          if (Array.isArray(columns) && columns.length > 0) {
            this.availableRelatedColumns = columns;
            console.log('Loaded available columns:', this.availableRelatedColumns.length, 'columns');
            // Add related columns that are already selected to the columns array
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
            console.warn('No available columns in response:', columns);
            this.availableRelatedColumns = [];
          }
        } else {
          console.warn('Empty response for available columns');
          this.availableRelatedColumns = [];
        }
      },
      error: (err) => {
        console.error('Error loading available columns:', err);
        this.availableRelatedColumns = [];
      }
    });
  }

  loadClaims(page: number, pageSize: number): void {
    this.loading = true;
    this.error = null;
    this.currentPage = page;

    // Build filters object from component state
    const filters: any = {};

    // Convert Excel-style status filters to statusList
    if (this.columnValueFilters['claStatus'] && this.columnValueFilters['claStatus'].size > 0) {
      const statusSet = this.columnValueFilters['claStatus'];
      // Remove '(Blank)' from the set and convert to array
      const statusArray = Array.from(statusSet).filter(s => s !== '(Blank)');
      if (statusArray.length > 0) {
        filters.statusList = statusArray;
      }
    }

    // Handle numeric filters for specific columns
    if (this.columnValueFilters['claID'] && this.columnValueFilters['claID'].size > 0) {
      const claimIdValues = Array.from(this.columnValueFilters['claID']).filter(v => v !== '(Blank)');
      if (claimIdValues.length > 0) {
        // Try to parse as numbers
        const claimIds = claimIdValues.map(v => parseInt(v, 10)).filter(id => !isNaN(id));
        if (claimIds.length > 0) {
          if (claimIds.length === 1) {
            // Single ID - use exact match via min/max
            filters.minClaimId = claimIds[0];
            filters.maxClaimId = claimIds[0];
          } else {
            // Multiple IDs - use min/max range
            filters.minClaimId = Math.min(...claimIds);
            filters.maxClaimId = Math.max(...claimIds);
          }
        }
      }
    }

    // Handle other numeric filters
    if (this.columnValueFilters['claTotalChargeTRIG'] && this.columnValueFilters['claTotalChargeTRIG'].size > 0) {
      const chargeValues = Array.from(this.columnValueFilters['claTotalChargeTRIG']).filter(v => v !== '(Blank)');
      const charges = chargeValues.map(v => parseFloat(v)).filter(c => !isNaN(c));
      if (charges.length > 0) {
        filters.minTotalCharge = Math.min(...charges);
        filters.maxTotalCharge = Math.max(...charges);
      }
    }

    if (this.columnValueFilters['claTotalBalanceCC'] && this.columnValueFilters['claTotalBalanceCC'].size > 0) {
      const balanceValues = Array.from(this.columnValueFilters['claTotalBalanceCC']).filter(v => v !== '(Blank)');
      const balances = balanceValues.map(v => parseFloat(v)).filter(b => !isNaN(b));
      if (balances.length > 0) {
        filters.minTotalBalance = Math.min(...balances);
        filters.maxTotalBalance = Math.max(...balances);
      }
    }

    // Text search across columns (for non-numeric, non-status columns)
    const textFilterColumns = this.columns.filter(c => 
      c.filterValue && 
      c.filterValue.toString().trim() !== '' &&
      c.key !== 'claID' &&
      c.key !== 'claStatus' &&
      c.key !== 'claTotalChargeTRIG' &&
      c.key !== 'claTotalBalanceCC'
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

    this.claimApiService.getClaims(page, pageSize, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ClaimsApiResponse) => {
          this.claims = response.data || [];
          this.filteredClaims = this.claims; // No client-side filtering needed
          this.meta = response.meta;
          this.loading = false;
          this.error = null;
        },
        error: (err) => {
          // Don't show error if request was cancelled (component destroyed during navigation)
          if (err.status === 0) {
            console.warn('Request cancelled or network error (likely due to navigation):', err);
          } else {
            this.error = 'Failed to load claims. Please check if the backend is running.';
            console.error('Error loading claims:', err);
          }
          this.loading = false;
        }
      });
  }

  ngOnDestroy(): void {
    // Complete the destroy subject to cancel all subscriptions
    this.destroy$.next();
    this.destroy$.complete();
  }

  onPageChange(page: number): void {
    this.loadClaims(page, this.pageSize);
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize = pageSize;
    this.loadClaims(1, pageSize); // Reset to page 1 when page size changes
  }

  onRowClick(claim: ClaimListItem): void {
    this.router.navigate(['/claims', claim.claID]);
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
    if (col) {
      col.visible = false;
    }
  }

  showColumn(columnKey: string): void {
    const col = this.columns.find(c => c.key === columnKey);
    if (col) {
      col.visible = true;
    }
  }

  onFilterChange(): void {
    // Reload from server with new filters
    this.loadClaims(1, this.pageSize); // Reset to page 1 when filters change
  }

  clearFilter(columnKey: string, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    const col = this.columns.find(c => c.key === columnKey);
    if (col) {
      col.filterValue = '';
      delete this.columnValueFilters[columnKey];
      // Reload from server
      this.loadClaims(1, this.pageSize);
    }
  }

  getCellValue(claim: ClaimListItem, key: string): any {
    // Check if it's a related column
    if (claim.additionalColumns && claim.additionalColumns[key] !== undefined) {
      return claim.additionalColumns[key];
    }
    // Otherwise, get from main claim object
    return (claim as any)[key];
  }

  openFilterPopup(columnKey: string, event: MouseEvent): void {
    event.stopPropagation();
    this.activeFilterColumnKey = columnKey;
    this.filterPopupSearchText = '';
    this.popupTextFilter = '';

    // position near the clicked button
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.filterPopupPosition = {
      topPx: Math.round(rect.bottom + 6),
      leftPx: Math.round(rect.left)
    };

    // Check if this is a numeric/text input column
    const isNumericColumn = this.isNumericColumn(columnKey);
    
    if (isNumericColumn) {
      // For numeric columns, initialize with existing text filter if any
      const existing = this.columnValueFilters[columnKey];
      if (existing && existing.size > 0) {
        const values = Array.from(existing).filter(v => v !== '(Blank)');
        this.popupTextFilter = values.join(', ');
      }
    } else {
      // Build the values list from currently loaded records
      // Note: For better UX, you could fetch distinct values from backend, but for now we use loaded data
      this.popupAllValues = this.getAllUniqueValuesForColumn(columnKey);

      // Initialize selection: existing filter, or default to "all selected"
      const existing = this.columnValueFilters[columnKey];
      this.popupSelectedValues = existing
        ? new Set<string>(existing)
        : new Set<string>(this.popupAllValues);
    }

    this.showFilterPopup = true;
  }

  isNumericColumn(columnKey: string): boolean {
    const numericColumns = ['claID', 'claTotalChargeTRIG', 'claTotalBalanceCC', 'claTotalAmtPaidCC'];
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
    // Reload from server
    this.loadClaims(1, this.pageSize);
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
        // Handle text/numeric input filter
        const textValue = this.popupTextFilter.trim();
        if (textValue) {
          // Parse comma-separated values
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
        // Handle checkbox-based value filter
        // If nothing selected => filter to zero rows (matches Excel)
        if (this.popupSelectedValues.size === 0) {
          this.columnValueFilters[key] = new Set<string>();
        }
        // If all selected => remove filter for this column
        else if (this.popupSelectedValues.size === this.popupAllValues.length) {
          delete this.columnValueFilters[key];
        }
        // Otherwise store selected values
        else {
          this.columnValueFilters[key] = new Set<string>(this.popupSelectedValues);
        }
      }
    }

    // Reload from server with new filters
    this.loadClaims(1, this.pageSize);
    this.closeFilterPopup();
  }

  private getAllUniqueValuesForColumn(columnKey: string): string[] {
    const uniq = new Set<string>();
    for (const claim of this.claims) {
      const v = this.getCellValue(claim, columnKey);
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

  onRelatedColumnToggle(columnKey: string, label: string, table: string, event: Event): void {
    event.stopPropagation();
    const checked = (event.target as HTMLInputElement).checked;
    console.log('Related column toggle:', columnKey, 'checked:', checked);
    if (checked) {
      this.addRelatedColumn(columnKey, label, table);
    } else {
      this.removeRelatedColumn(columnKey);
    }
  }

  toggleRelatedColumn(columnKey: string, label: string, table: string): void {
    console.log('Toggle related column clicked:', columnKey, label);
    const isSelected = this.isRelatedColumnSelected(columnKey);
    console.log('Currently selected:', isSelected);
    if (isSelected) {
      console.log('Removing column:', columnKey);
      this.removeRelatedColumn(columnKey);
    } else {
      console.log('Adding column:', columnKey);
      this.addRelatedColumn(columnKey, label, table);
    }
  }

  addRelatedColumn(columnKey: string, label: string, table: string): void {
    console.log('Adding related column:', columnKey, label);
    // Check if column already exists
    if (this.columns.some(c => c.key === columnKey)) {
      console.log('Column already exists:', columnKey);
      return;
    }

    // Add to selected columns
    this.selectedAdditionalColumns.add(columnKey);

    // Add to columns array
    this.columns.push({
      key: columnKey,
      label: label,
      visible: true,
      filterValue: '',
      isRelatedColumn: true,
      table: table
    });

    console.log('Added column, reloading data...');
    // Reload data with new column
    this.loadClaims(this.currentPage, this.pageSize);
  }

  removeRelatedColumn(columnKey: string): void {
    // Remove from selected columns
    this.selectedAdditionalColumns.delete(columnKey);

    // Remove from columns array
    const index = this.columns.findIndex(c => c.key === columnKey);
    if (index >= 0) {
      this.columns.splice(index, 1);
    }

    // Reload data without the column
    this.loadClaims(this.currentPage, this.pageSize);
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

  getVisibleRelatedColumns(): Array<{ table: string; key: string; label: string; path: string }> {
    return this.availableRelatedColumns.filter(col => 
      this.selectedAdditionalColumns.has(col.key) && 
      this.columns.some(c => c.key === col.key && c.visible)
    );
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
    if (col) {
      col.visible = !col.visible;
    }
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

  // Client-side filtering removed - all filtering is now done server-side
  // This method is kept for backward compatibility but just assigns claims to filteredClaims
  private applyFilters(): void {
    // No client-side filtering - data is already filtered from server
    this.filteredClaims = [...this.claims];
  }

  getColumnLabel(columnKey: string): string {
    const col = this.columns.find(c => c.key === columnKey);
    return col ? col.label : columnKey;
  }
}

