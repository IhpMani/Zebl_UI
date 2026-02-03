import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { PatientApiService } from '../../core/services/patient-api.service';
import { PatientListItem, PatientsApiResponse, PaginationMeta } from '../../core/services/patient.models';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-patient-list',
  templateUrl: './patient-list.component.html',
  styleUrls: ['./patient-list.component.css']
})
export class PatientListComponent implements OnInit, OnDestroy {
  patients: PatientListItem[] = [];
  filteredPatients: PatientListItem[] = [];
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
    { key: 'patID', label: 'Patient ID', visible: true, filterValue: '' },
    { key: 'patFullNameCC', label: 'Full Name', visible: true, filterValue: '' },
    { key: 'patFirstName', label: 'First Name', visible: false, filterValue: '' },
    { key: 'patLastName', label: 'Last Name', visible: false, filterValue: '' },
    { key: 'patDateTimeCreated', label: 'Date Created', visible: true, filterValue: '' },
    { key: 'patActive', label: 'Active', visible: true, filterValue: '' },
    { key: 'patAccountNo', label: 'Account No', visible: true, filterValue: '' },
    { key: 'patBirthDate', label: 'Birth Date', visible: false, filterValue: '' },
    { key: 'patPhoneNo', label: 'Phone', visible: true, filterValue: '' },
    { key: 'patCity', label: 'City', visible: false, filterValue: '' },
    { key: 'patState', label: 'State', visible: false, filterValue: '' },
    { key: 'patTotalBalanceCC', label: 'Total Balance', visible: true, filterValue: '' }
  ];

  constructor(
    private patientApiService: PatientApiService,
    private router: Router
  ) { }

  currentPage: number = 1;
  pageSize: number = 25;

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.loadAvailableColumns();
    this.loadPatients(this.currentPage, this.pageSize);
  }

  loadAvailableColumns(): void {
    this.patientApiService.getAvailableColumns()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (response: any) => {
        if (response) {
          const columns = response.data || response;
          if (Array.isArray(columns) && columns.length > 0) {
            this.availableRelatedColumns = columns;
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

  loadPatients(page: number, pageSize: number): void {
    this.loading = true;
    this.error = null;
    this.currentPage = page;

    const filters: any = {};

    if (this.columnValueFilters['patActive'] && this.columnValueFilters['patActive'].size > 0) {
      const activeSet = this.columnValueFilters['patActive'];
      const activeArray = Array.from(activeSet).filter(s => s !== '(Blank)');
      if (activeArray.length === 1) {
        filters.active = activeArray[0] === 'true';
      }
    }

    // Handle numeric filters for Patient ID
    if (this.columnValueFilters['patID'] && this.columnValueFilters['patID'].size > 0) {
      const patientIdValues = Array.from(this.columnValueFilters['patID']).filter(v => v !== '(Blank)');
      if (patientIdValues.length > 0) {
        const patientIds = patientIdValues.map(v => parseInt(v, 10)).filter(id => !isNaN(id));
        if (patientIds.length > 0) {
          if (patientIds.length === 1) {
            filters.minPatientId = patientIds[0];
            filters.maxPatientId = patientIds[0];
          } else {
            filters.minPatientId = Math.min(...patientIds);
            filters.maxPatientId = Math.max(...patientIds);
          }
        }
      }
    }

    // Text search across columns (for non-numeric columns)
    const textFilterColumns = this.columns.filter(c => 
      c.filterValue && 
      c.filterValue.toString().trim() !== '' &&
      c.key !== 'patID' &&
      c.key !== 'patActive'
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

    this.patientApiService.getPatients(page, pageSize, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PatientsApiResponse) => {
          this.patients = response.data || [];
          this.filteredPatients = this.patients;
          this.meta = response.meta;
          this.loading = false;
          this.error = null;
        },
        error: (err) => {
          if (err.status === 0) {
            console.warn('Request cancelled or network error (likely due to navigation):', err);
          } else {
            this.error = 'Failed to load patients. Please check if the backend is running.';
            console.error('Error loading patients:', err);
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
    this.loadPatients(page, this.pageSize);
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize = pageSize;
    this.loadPatients(1, pageSize);
  }

  onRowClick(patient: PatientListItem): void {
    // Navigate to patient details if needed
    // this.router.navigate(['/patients', patient.patID]);
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
    this.loadPatients(1, this.pageSize);
  }

  clearFilter(columnKey: string, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    const col = this.columns.find(c => c.key === columnKey);
    if (col) {
      col.filterValue = '';
      delete this.columnValueFilters[columnKey];
      this.loadPatients(1, this.pageSize);
    }
  }

  getCellValue(patient: PatientListItem, key: string): any {
    const columnDefinition = this.columns.find(c => c.key === key);
    if (columnDefinition?.isRelatedColumn && patient.additionalColumns) {
      return patient.additionalColumns[key];
    }
    return (patient as any)[key];
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
    const numericColumns = ['patID', 'patTotalBalanceCC'];
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
    this.loadPatients(1, this.pageSize);
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
    this.loadPatients(1, this.pageSize);
    this.closeFilterPopup();
  }

  private getAllUniqueValuesForColumn(columnKey: string): string[] {
    const uniq = new Set<string>();
    for (const patient of this.patients) {
      const v = this.getCellValue(patient, columnKey);
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
    this.loadPatients(this.currentPage, this.pageSize);
  }

  removeRelatedColumn(columnKey: string): void {
    this.selectedAdditionalColumns.delete(columnKey);
    const index = this.columns.findIndex(c => c.key === columnKey);
    if (index >= 0) {
      this.columns.splice(index, 1);
    }
    this.loadPatients(this.currentPage, this.pageSize);
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
