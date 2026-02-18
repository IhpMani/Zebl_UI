import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { PatientApiService } from '../../core/services/patient-api.service';
import { RibbonContextService } from '../../core/services/ribbon-context.service';
import { PatientListItem, PatientsApiResponse, PaginationMeta } from '../../core/services/patient.models';
import { ListApiService } from '../../core/services/list-api.service';
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
    { key: 'patTotalBalanceCC', label: 'Total Balance', visible: true, filterValue: '' },
    { key: 'patSSN', label: 'SSN', visible: false, filterValue: '' },
    { key: 'patSex', label: 'Sex', visible: false, filterValue: '' },
    { key: 'patAddress', label: 'Address', visible: false, filterValue: '' },
    { key: 'patZip', label: 'ZIP', visible: false, filterValue: '' },
    { key: 'patCellPhoneNo', label: 'Cell Phone', visible: false, filterValue: '' },
    { key: 'patPriEmail', label: 'Email', visible: false, filterValue: '' },
    { key: 'patBillingPhyFID', label: 'Billing Physician ID', visible: false, filterValue: '' },
    { key: 'patClassification', label: 'Facility', visible: true, filterValue: '' },
    { key: 'patMI', label: 'MI', visible: false, filterValue: '' },
    { key: 'patDateTimeModified', label: 'Date Modified', visible: false, filterValue: '' },
    { key: 'patCreatedUserGUID', label: 'Created User GUID', visible: false, filterValue: '' },
    { key: 'patLastUserGUID', label: 'Last User GUID', visible: false, filterValue: '' },
    { key: 'patCreatedUserName', label: 'Created User Name', visible: false, filterValue: '' },
    { key: 'patLastUserName', label: 'Last User Name', visible: false, filterValue: '' },
    { key: 'patCreatedComputerName', label: 'Created Computer Name', visible: false, filterValue: '' },
    { key: 'patLastComputerName', label: 'Last Computer Name', visible: false, filterValue: '' },
    { key: 'patAddress2', label: 'Address 2', visible: false, filterValue: '' },
    { key: 'patAptReminderPref', label: 'Apt Reminder Pref', visible: false, filterValue: '' },
    { key: 'patAuthTracking', label: 'Auth Tracking', visible: false, filterValue: '' },
    { key: 'patBox8Reserved', label: 'Box 8 Reserved', visible: false, filterValue: '' },
    { key: 'patBox9bReserved', label: 'Box 9b Reserved', visible: false, filterValue: '' },
    { key: 'patBox9cReserved', label: 'Box 9c Reserved', visible: false, filterValue: '' },
    { key: 'patCellSMTPHost', label: 'Cell SMTP Host', visible: false, filterValue: '' },
    { key: 'patClaLibFID', label: 'Claim Library ID', visible: false, filterValue: '' },
    { key: 'patClaimDefaults', label: 'Claim Defaults', visible: false, filterValue: '' },
    { key: 'patCoPayAmount', label: 'Co Pay Amount', visible: false, filterValue: '' },
    { key: 'patCoPayPercent', label: 'Co Pay Percent', visible: false, filterValue: '' },
    { key: 'patCustomField1', label: 'Custom Field 1', visible: false, filterValue: '' },
    { key: 'patCustomField2', label: 'Custom Field 2', visible: false, filterValue: '' },
    { key: 'patCustomField3', label: 'Custom Field 3', visible: false, filterValue: '' },
    { key: 'patCustomField4', label: 'Custom Field 4', visible: false, filterValue: '' },
    { key: 'patCustomField5', label: 'Custom Field 5', visible: false, filterValue: '' },
    { key: 'patDiagnosis1', label: 'Diagnosis 1', visible: false, filterValue: '' },
    { key: 'patDiagnosis2', label: 'Diagnosis 2', visible: false, filterValue: '' },
    { key: 'patDiagnosis3', label: 'Diagnosis 3', visible: false, filterValue: '' },
    { key: 'patDiagnosis4', label: 'Diagnosis 4', visible: false, filterValue: '' },
    { key: 'patDiagnosis5', label: 'Diagnosis 5', visible: false, filterValue: '' },
    { key: 'patDiagnosis6', label: 'Diagnosis 6', visible: false, filterValue: '' },
    { key: 'patDiagnosis7', label: 'Diagnosis 7', visible: false, filterValue: '' },
    { key: 'patDiagnosis8', label: 'Diagnosis 8', visible: false, filterValue: '' },
    { key: 'patDiagnosis9', label: 'Diagnosis 9', visible: false, filterValue: '' },
    { key: 'patDiagnosis10', label: 'Diagnosis 10', visible: false, filterValue: '' },
    { key: 'patDiagnosis11', label: 'Diagnosis 11', visible: false, filterValue: '' },
    { key: 'patDiagnosis12', label: 'Diagnosis 12', visible: false, filterValue: '' },
    { key: 'patDontSendPromotions', label: 'Dont Send Promotions', visible: false, filterValue: '' },
    { key: 'patDontSendStatements', label: 'Dont Send Statements', visible: false, filterValue: '' },
    { key: 'patEmergencyContactName', label: 'Emergency Contact Name', visible: false, filterValue: '' },
    { key: 'patEmergencyContactPhoneNo', label: 'Emergency Contact Phone No', visible: false, filterValue: '' },
    { key: 'patEmergencyContactRelation', label: 'Emergency Contact Relation', visible: false, filterValue: '' },
    { key: 'patEmployed', label: 'Employed', visible: false, filterValue: '' },
    { key: 'patExternalFID', label: 'External FID', visible: false, filterValue: '' },
    { key: 'patEZClaimPayConsent', label: 'EZ Claim Pay Consent', visible: false, filterValue: '' },
    { key: 'patFacilityPhyFID', label: 'Facility Physician ID', visible: false, filterValue: '' },
    { key: 'patFaxNo', label: 'Fax No', visible: false, filterValue: '' },
    { key: 'patFirstDateTRIG', label: 'First Date TRIG', visible: false, filterValue: '' },
    { key: 'patHeight', label: 'Height', visible: false, filterValue: '' },
    { key: 'patHomePhoneNo', label: 'Home Phone No', visible: false, filterValue: '' },
    { key: 'patInsuredSigOnFile', label: 'Insured Sig On File', visible: false, filterValue: '' },
    { key: 'patLastAppointmentKeptTRIG', label: 'Last Appointment Kept TRIG', visible: false, filterValue: '' },
    { key: 'patLastAppointmentNotKeptTRIG', label: 'Last Appointment Not Kept TRIG', visible: false, filterValue: '' },
    { key: 'patLastServiceDateTRIG', label: 'Last Service Date TRIG', visible: false, filterValue: '' },
    { key: 'patLastCellSMPTHostUpdate', label: 'Last Cell SMTP Host Update', visible: false, filterValue: '' },
    { key: 'patLastStatementDateTRIG', label: 'Last Statement Date TRIG', visible: false, filterValue: '' },
    { key: 'patLastPatPmtDateTRIG', label: 'Last Pat Pmt Date TRIG', visible: false, filterValue: '' },
    { key: 'patLocked', label: 'Locked', visible: false, filterValue: '' },
    { key: 'patMarried', label: 'Married', visible: false, filterValue: '' },
    { key: 'patMemberID', label: 'Member ID', visible: false, filterValue: '' },
    { key: 'patOrderingPhyFID', label: 'Ordering Physician ID', visible: false, filterValue: '' },
    { key: 'patPhyPrintDate', label: 'Phy Print Date', visible: false, filterValue: '' },
    { key: 'patPrintSigDate', label: 'Print Sig Date', visible: false, filterValue: '' },
    { key: 'patReferringPhyFID', label: 'Referring Physician ID', visible: false, filterValue: '' },
    { key: 'patRecallDate', label: 'Recall Date', visible: false, filterValue: '' },
    { key: 'patReminderNote', label: 'Reminder Note', visible: false, filterValue: '' },
    { key: 'patReminderNoteEvent', label: 'Reminder Note Event', visible: false, filterValue: '' },
    { key: 'patRenderingPhyFID', label: 'Rendering Physician ID', visible: false, filterValue: '' },
    { key: 'patResourceWants', label: 'Resource Wants', visible: false, filterValue: '' },
    { key: 'patSecEmail', label: 'Sec Email', visible: false, filterValue: '' },
    { key: 'patSigOnFile', label: 'Sig On File', visible: false, filterValue: '' },
    { key: 'patSigSource', label: 'Sig Source', visible: false, filterValue: '' },
    { key: 'patSigText', label: 'Sig Text', visible: false, filterValue: '' },
    { key: 'patStatementAddressLine1', label: 'Statement Address Line 1', visible: false, filterValue: '' },
    { key: 'patStatementAddressLine2', label: 'Statement Address Line 2', visible: false, filterValue: '' },
    { key: 'patStatementCity', label: 'Statement City', visible: false, filterValue: '' },
    { key: 'patStatementName', label: 'Statement Name', visible: false, filterValue: '' },
    { key: 'patStatementMessage', label: 'Statement Message', visible: false, filterValue: '' },
    { key: 'patStatementState', label: 'Statement State', visible: false, filterValue: '' },
    { key: 'patStatementZipCode', label: 'Statement Zip Code', visible: false, filterValue: '' },
    { key: 'patSupervisingPhyFID', label: 'Supervising Physician ID', visible: false, filterValue: '' },
    { key: 'patTotalInsBalanceTRIG', label: 'Total Ins Balance TRIG', visible: false, filterValue: '' },
    { key: 'patTotalPatBalanceTRIG', label: 'Total Pat Balance TRIG', visible: false, filterValue: '' },
    { key: 'patTotalUndisbursedPaymentsTRIG', label: 'Total Undisbursed Payments TRIG', visible: false, filterValue: '' },
    { key: 'patWeight', label: 'Weight', visible: false, filterValue: '' },
    { key: 'patWorkPhoneNo', label: 'Work Phone No', visible: false, filterValue: '' },
    { key: 'patLastPaymentRequestTRIG', label: 'Last Payment Request TRIG', visible: false, filterValue: '' },
    { key: 'patFirstNameTruncatedCC', label: 'First Name Truncated CC', visible: false, filterValue: '' },
    { key: 'patLastNameTruncatedCC', label: 'Last Name Truncated CC', visible: false, filterValue: '' },
    { key: 'patFullNameFMLCC', label: 'Full Name FML CC', visible: false, filterValue: '' },
    { key: 'patDiagnosisCodesCC', label: 'Diagnosis Codes CC', visible: false, filterValue: '' },
    { key: 'patTotalBalanceIncludingUndisbursedPatPmtsCC', label: 'Total Balance Including Undisbursed Pat Pmts CC', visible: false, filterValue: '' },
    { key: 'patTotalPatBalanceIncludingUndisbursedPatPmtsCC', label: 'Total Pat Balance Including Undisbursed Pat Pmts CC', visible: false, filterValue: '' },
    { key: 'patCityStateZipCC', label: 'City State Zip CC', visible: false, filterValue: '' },
    { key: 'patStatementCityStateZipCC', label: 'Statement City State Zip CC', visible: false, filterValue: '' }
  ];

  constructor(
    private patientApiService: PatientApiService,
    private listApiService: ListApiService,
    private router: Router,
    private ribbonContext: RibbonContextService
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

    // Facility (patClassification) filter - from Libraries → List → Patient Classification
    if (this.columnValueFilters['patClassification'] && this.columnValueFilters['patClassification'].size > 0) {
      const vals = Array.from(this.columnValueFilters['patClassification']);
      if (vals.length > 0) {
        filters.classificationList = vals.join(',');
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
          this.filteredPatients = this.applyClientSideFilters(this.patients);
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
    this.ribbonContext.setContext({ patientId: patient.patID, claimId: null });
    this.router.navigate(['/patients', patient.patID]);
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
    const popupWidth = 260;
    const popupMaxHeight = Math.min(420, window.innerHeight - 24);
    let topPx = Math.round(rect.bottom + 6);
    if (topPx + popupMaxHeight > window.innerHeight) {
      topPx = Math.max(8, window.innerHeight - popupMaxHeight);
    }
    let leftPx = Math.round(rect.left);
    if (leftPx + popupWidth > window.innerWidth - 8) {
      leftPx = Math.max(8, window.innerWidth - popupWidth - 8);
    }
    this.filterPopupPosition = { topPx, leftPx };
    
    const isNumeric = this.isNumericColumn(columnKey);
    
    if (isNumeric) {
      const existing = this.columnValueFilters[columnKey];
      if (existing && existing.size > 0) {
        const values = Array.from(existing).filter(v => v !== '(Blank)');
        this.popupTextFilter = values.join(', ');
      }
      this.showFilterPopup = true;
    } else if (columnKey === 'patClassification') {
      // Facility: merge values from Patient Classification list (Libraries → List) with existing patient data
      const fromPatients = this.getAllUniqueValuesForColumn(columnKey);
      this.listApiService.getListValues('Patient Classification')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            const fromList = (res.data || []).map(v => v.value?.trim()).filter(Boolean) || [];
            const merged = [...new Set([...fromList, ...fromPatients])];
            merged.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
            this.popupAllValues = merged;
            const existing = this.columnValueFilters[columnKey];
            this.popupSelectedValues = existing ? new Set<string>(existing) : new Set<string>(this.popupAllValues);
            this.showFilterPopup = true;
          },
          error: () => {
            this.popupAllValues = fromPatients;
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

  /** Apply columnValueFilters that are not sent to the API (client-side filtering) */
  private applyClientSideFilters(patients: PatientListItem[]): PatientListItem[] {
    const serverFilterKeys = ['patActive', 'patID', 'patClassification'];
    let result = patients;
    for (const key of Object.keys(this.columnValueFilters)) {
      const selected = this.columnValueFilters[key];
      if (!selected || selected.size === 0) return []; // User selected none = show nothing
      if (serverFilterKeys.includes(key)) continue; // Already filtered by server
      result = result.filter(p => {
        const v = this.getCellValue(p, key);
        const s = (v ?? '').toString().trim();
        const displayVal = s === '' ? '(Blank)' : s;
        return selected.has(displayVal);
      });
    }
    return result;
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
