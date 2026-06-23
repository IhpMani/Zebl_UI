import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ServiceApiService } from '../../core/services/service-api.service';
import { ServiceListItem, ServicesApiResponse, PaginationMeta } from '../../core/services/service.models';
import { Subject, takeUntil } from 'rxjs';
import { WorkspaceService } from '../../workspace/application/workspace.service';
import { getListCellValue } from '../../core/utils/list-cell-value';
import { formatApiDateTimeDisplay, isApiDateTimeColumnKey } from '../../core/utils/api-datetime-display';
import {
  buildFlatListPickerSections,
  dedupeListPickerColumns,
  filterListPickerColumns
} from '../../core/utils/list-column-picker.utils';
import {
  buildColumnPreferencesPayload,
  orderVisibleColumns,
  parseColumnPreferences,
  visibleKeysInDisplayOrder
} from '../../claims/shared/claim-column-preferences';
import {
  cloneDefaultServiceListColumns,
  DEFAULT_SERVICE_LIST_COLUMNS,
  SERVICE_LIST_COLUMN_PREFS_KEY,
  SERVICE_LIST_COLUMN_PREFS_VERSION,
  SERVICE_LIST_DEFAULT_VISIBLE_KEYS,
  ServiceListColumnDef
} from './service-list-default-columns';

@Component({
  selector: 'app-service-list',
  templateUrl: './service-list.component.html',
  styleUrls: ['./service-list.component.css']
})
export class ServiceListComponent implements OnInit, OnDestroy {
  services: ServiceListItem[] = [];
  filteredServices: ServiceListItem[] = [];
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
  columnDisplayOrder: string[] = [...SERVICE_LIST_DEFAULT_VISIBLE_KEYS];

  private destroy$ = new Subject<void>();

  columns: ServiceListColumnDef[] = cloneDefaultServiceListColumns();

  constructor(
    private serviceApiService: ServiceApiService,
    private router: Router,
    private workspace: WorkspaceService
  ) { }

  currentPage: number = 1;
  pageSize: number = 25;

  ngOnInit(): void {
    this.workspace.updateActiveTabTitle('Find Services');
    this.mergeMissingColumnDefinitions();
    this.loadColumnPreferences();
    this.deduplicateColumns();
    this.loadAvailableColumns();
    this.loadServices(this.currentPage, this.pageSize);
  }

  loadAvailableColumns(): void {
    this.serviceApiService.getAvailableColumns()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response) {
            const columns = response.data ?? response.Data ?? response;
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
          // Only log error, don't show to user - this is not critical
          console.error('Error loading available columns:', err);
          this.availableRelatedColumns = [];
        }
      });
  }

  loadServices(page: number, pageSize: number): void {
    this.loading = true;
    this.error = null;
    this.currentPage = page;

    const filters: any = {};

    // Handle numeric filters for Service ID
    if (this.columnValueFilters['srvID'] && this.columnValueFilters['srvID'].size > 0) {
      const serviceIdValues = Array.from(this.columnValueFilters['srvID']).filter(v => v !== '(Blank)');
      if (serviceIdValues.length > 0) {
        const serviceIds = serviceIdValues.map(v => parseInt(v, 10)).filter(id => !isNaN(id));
        if (serviceIds.length > 0) {
          if (serviceIds.length === 1) {
            filters.minServiceId = serviceIds[0];
            filters.maxServiceId = serviceIds[0];
          } else {
            filters.minServiceId = Math.min(...serviceIds);
            filters.maxServiceId = Math.max(...serviceIds);
          }
        }
      }
    }

    // Handle numeric filters for Charges
    if (this.columnValueFilters['srvCharges'] && this.columnValueFilters['srvCharges'].size > 0) {
      const chargeValues = Array.from(this.columnValueFilters['srvCharges']).filter(v => v !== '(Blank)');
      const charges = chargeValues.map(v => parseFloat(v)).filter(c => !isNaN(c));
      if (charges.length > 0) {
        filters.minCharges = Math.min(...charges);
        filters.maxCharges = Math.max(...charges);
      }
    }

    // Handle Claim ID filter
    if (this.columnValueFilters['srvClaFID'] && this.columnValueFilters['srvClaFID'].size > 0) {
      const claimIdValues = Array.from(this.columnValueFilters['srvClaFID']).filter(v => v !== '(Blank)');
      const claimIds = claimIdValues.map(v => parseInt(v, 10)).filter(id => !isNaN(id));
      if (claimIds.length > 0) {
        // Use the first claim ID (or could support multiple)
        filters.claimId = claimIds[0];
      }
    }

    // Text search across columns (for non-numeric columns)
    const textFilterColumns = this.columns.filter(c => 
      c.filterValue && 
      c.filterValue.toString().trim() !== '' &&
      c.key !== 'srvID' &&
      c.key !== 'srvCharges' &&
      c.key !== 'srvClaFID'
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

    this.serviceApiService.getServices(page, pageSize, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ServicesApiResponse) => {
          this.services = response.data || [];
          this.filteredServices = this.services;
          this.meta = response.meta;
          this.loading = false;
          this.error = null;
        },
        error: (err) => {
          // Don't show error if request was cancelled (component destroyed during navigation)
          // Check if it's a network error (status 0) or if the error is due to navigation
          if (err.status === 0) {
            // Network error or cancelled request - don't show error during navigation
            console.warn('Request cancelled or network error (likely due to navigation):', err);
          } else {
            // Real error - show to user
            this.error = 'Failed to load services. Please check if the backend is running.';
            console.error('Error loading services:', err);
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
    this.loadServices(page, this.pageSize);
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize = pageSize;
    this.loadServices(1, pageSize);
  }

  onRowClick(service: ServiceListItem): void {
    const claimId = service.srvClaFID;
    if (claimId) {
      this.router.navigate(['claims', claimId]);
    }
  }

  getTotalPages(): number {
    if (!this.meta) return 0;
    return Math.ceil(this.meta.totalCount / this.meta.pageSize);
  }

  get visibleColumns() {
    return orderVisibleColumns(this.columns, this.columnDisplayOrder);
  }

  hideColumn(columnKey: string): void {
    const col = this.columns.find(c => c.key === columnKey);
    if (col) {
      col.visible = false;
      this.saveColumnPreferences();
    }
  }

  showColumn(columnKey: string): void {
    const col = this.columns.find(c => c.key === columnKey);
    if (col) col.visible = true;
  }

  onFilterChange(): void {
    this.loadServices(1, this.pageSize);
  }

  clearFilter(columnKey: string, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    const col = this.columns.find(c => c.key === columnKey);
    if (col) {
      col.filterValue = '';
      delete this.columnValueFilters[columnKey];
      this.loadServices(1, this.pageSize);
    }
  }

  getCellValue(service: ServiceListItem, key: string): any {
    return getListCellValue(service, key);
  }

  formatDateTimeDisplay(value: unknown): string {
    return formatApiDateTimeDisplay(value);
  }

  isDateTimeColumnKey(key: string): boolean {
    return isApiDateTimeColumnKey(key);
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
      this.popupSelectedValues = existing
        ? new Set<string>(existing)
        : new Set<string>(this.popupAllValues);
    }
    this.showFilterPopup = true;
  }

  isNumericColumn(columnKey: string): boolean {
    const numericColumns = ['srvID', 'srvCharges', 'srvClaFID', 'srvUnits', 'srvTotalBalanceCC', 'srvTotalAmtPaidCC'];
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
    this.loadServices(1, this.pageSize);
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
    this.loadServices(1, this.pageSize);
    this.closeFilterPopup();
  }

  private getAllUniqueValuesForColumn(columnKey: string): string[] {
    const uniq = new Set<string>();
    for (const service of this.services) {
      const v = this.getCellValue(service, columnKey);
      const s = (v ?? '').toString().trim();
      uniq.add(s === '' ? '(Blank)' : s);
    }
    const all = Array.from(uniq);
    all.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    return all;
  }

  toggleCustomizationDialog(): void {
    const opening = !this.showCustomizationDialog;
    this.showCustomizationDialog = opening;
    if (opening) {
      this.logPickerColumnState('dialog-open');
    } else {
      this.columnSearchText = '';
    }
  }

  closeCustomizationDialog(event?: MouseEvent): void {
    const shouldClose =
      !event || (event.target as HTMLElement).classList.contains('customization-overlay');
    if (shouldClose) {
      this.saveColumnPreferences();
      this.dumpColumns('dialog-close');
      this.showCustomizationDialog = false;
      this.columnSearchText = '';
    }
  }

  isColumnVisible(columnKey: string): boolean {
    return this.columns.find(c => c.key === columnKey)?.visible === true;
  }

  onPickerLabelClick(columnKey: string, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.setColumnVisible(columnKey, !this.isColumnVisible(columnKey));
  }

  setColumnVisible(columnKey: string, visible: boolean): void {
    console.log('checkbox clicked', columnKey, visible);
    console.log('columns before', this.snapshotColumnsForLog());
    const col = this.columns.find(c => c.key === columnKey);
    if (!col) {
      console.warn('[ServiceList] column not found for toggle:', columnKey);
      return;
    }
    col.visible = visible;
    if (visible && !this.columnDisplayOrder.includes(columnKey)) {
      this.columnDisplayOrder = [...this.columnDisplayOrder, columnKey];
    }
    console.log('columns after', this.snapshotColumnsForLog());
    if (columnKey === 'srvPlace') {
      console.log(
        'srvPlace visible after toggle:',
        this.columns.find(c => c.key === 'srvPlace')?.visible
      );
    }
  }

  toggleColumnVisibility(columnKey: string): void {
    this.setColumnVisible(columnKey, !this.isColumnVisible(columnKey));
  }

  clearAllColumns(): void {
    this.columns.forEach(col => (col.visible = false));
    this.columnDisplayOrder = [];
    this.saveColumnPreferences();
  }

  dumpColumns(context = 'manual'): void {
    console.log(`[ServiceList] columns dump (${context})`, this.snapshotColumnsForLog());
    console.log('[ServiceList] srvPlace entry', this.columns.find(c => c.key === 'srvPlace'));
    console.log('[ServiceList] visible column keys', this.visibleColumns.map(c => c.key));
    console.log(
      '[ServiceList] localStorage prefs',
      localStorage.getItem(SERVICE_LIST_COLUMN_PREFS_KEY)
    );
  }

  private snapshotColumnsForLog(): Array<{ key: string; label: string; visible: boolean }> {
    return this.columns.map(c => ({ key: c.key, label: c.label, visible: c.visible }));
  }

  private logPickerColumnState(context: string): void {
    const { unique, duplicateKeys } = dedupeListPickerColumns(this.columns);
    console.log(`[ServiceList] deduped columns (${context})`, unique.map(c => c.key));
    if (duplicateKeys.length > 0) {
      console.warn('[ServiceList] duplicate column keys', duplicateKeys);
    }
    console.log(
      '[ServiceList] srvPlace in source columns:',
      this.columns.find(c => c.key === 'srvPlace')
    );
    console.log(
      '[ServiceList] srvPlace in deduped picker:',
      unique.find(c => c.key === 'srvPlace')
    );
  }

  saveColumnPreferences(): void {
    const preferences = buildColumnPreferencesPayload(
      SERVICE_LIST_COLUMN_PREFS_VERSION,
      visibleKeysInDisplayOrder(this.columns, this.columnDisplayOrder),
      this.selectedAdditionalColumns
    );
    localStorage.setItem(SERVICE_LIST_COLUMN_PREFS_KEY, JSON.stringify(preferences));
    this.columnDisplayOrder = preferences.visibleColumns;
    console.log('[ServiceList] saved column preferences', preferences);
  }

  loadColumnPreferences(): void {
    const preferences = parseColumnPreferences(
      localStorage.getItem(SERVICE_LIST_COLUMN_PREFS_KEY)
    );
    if (!preferences) {
      this.applyDefaultColumnConfiguration();
      return;
    }

    try {
      const visibleKeys = new Set(preferences.visibleColumns);
      this.columnDisplayOrder = [...preferences.visibleColumns];

      this.columns.forEach(col => {
        if (!col.isRelatedColumn) {
          col.visible = visibleKeys.has(col.key);
        }
      });

      if (preferences.selectedAdditional) {
        preferences.selectedAdditional.forEach(key => this.selectedAdditionalColumns.add(key));
      }

      this.mergeMissingColumnDefinitions();
      this.deduplicateColumns();
    } catch (e) {
      console.error('[ServiceList] error loading column preferences:', e);
      this.applyDefaultColumnConfiguration();
    }
  }

  private applyDefaultColumnConfiguration(): void {
    const defaultVisible = new Set<string>(SERVICE_LIST_DEFAULT_VISIBLE_KEYS);
    this.columns.forEach(col => {
      col.visible = defaultVisible.has(col.key);
    });
    this.columnDisplayOrder = [...SERVICE_LIST_DEFAULT_VISIBLE_KEYS];
    this.selectedAdditionalColumns = new Set<string>();
  }

  private mergeMissingColumnDefinitions(): void {
    const byKey = new Map(this.columns.map(col => [col.key, col]));
    for (const def of DEFAULT_SERVICE_LIST_COLUMNS) {
      if (!byKey.has(def.key)) {
        this.columns.push({ ...def });
        console.log('[ServiceList] migrated missing column definition:', def.key);
      }
    }
    if (!this.columns.some(c => c.key === 'srvPlace')) {
      this.columns.push({ key: 'srvPlace', label: 'Place', visible: false, filterValue: '' });
      console.log('[ServiceList] migrated missing srvPlace column');
    }
  }

  private deduplicateColumns(): void {
    const mergedByKey = new Map<string, ServiceListColumnDef>();
    for (const col of this.columns) {
      const key = col.key;
      if (!key) continue;
      const existing = mergedByKey.get(key);
      if (!existing) {
        mergedByKey.set(key, col);
        continue;
      }
      if (col.visible && !existing.visible) {
        mergedByKey.set(key, { ...existing, ...col, visible: true });
      }
    }
    this.columns = Array.from(mergedByKey.values());
  }

  get filteredColumnsForDialog() {
    return filterListPickerColumns(this.columns, this.columnSearchText);
  }

  get columnPickerSections() {
    const { unique, duplicateKeys } = dedupeListPickerColumns(this.columns);
    if (duplicateKeys.length > 0) {
      console.warn('[ServiceList] columnPickerSections duplicate keys', duplicateKeys);
    }
    return buildFlatListPickerSections(unique, this.columnSearchText, { standardOnly: true });
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
      const existing = this.columns.find(c => c.key === columnKey);
      if (existing) {
        existing.visible = true;
        if (!this.columnDisplayOrder.includes(columnKey)) {
          this.columnDisplayOrder = [...this.columnDisplayOrder, columnKey];
        }
        this.saveColumnPreferences();
      }
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
    if (!this.columnDisplayOrder.includes(columnKey)) {
      this.columnDisplayOrder = [...this.columnDisplayOrder, columnKey];
    }
    this.saveColumnPreferences();
    this.loadServices(this.currentPage, this.pageSize);
  }

  removeRelatedColumn(columnKey: string): void {
    this.selectedAdditionalColumns.delete(columnKey);
    const index = this.columns.findIndex(c => c.key === columnKey);
    if (index >= 0) {
      this.columns.splice(index, 1);
    }
    this.columnDisplayOrder = this.columnDisplayOrder.filter(k => k !== columnKey);
    this.saveColumnPreferences();
    this.loadServices(this.currentPage, this.pageSize);
  }

  getColumnLabel(columnKey: string): string {
    const col = this.columns.find(c => c.key === columnKey);
    return col ? col.label : columnKey;
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

  getCurrencyTone(amount: unknown): string {
    const n = Number(amount);
    if (!Number.isFinite(n)) return 'money-neutral';
    if (n > 0) return 'money-positive';
    if (n < 0) return 'money-negative';
    return 'money-zero';
  }
}
