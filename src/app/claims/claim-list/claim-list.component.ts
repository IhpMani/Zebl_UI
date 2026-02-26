import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ClaimApiService } from '../../core/services/claim-api.service';
import { ClaimListItem, ClaimsApiResponse, PaginationMeta } from '../../core/services/claim.models';
import { Subject, takeUntil } from 'rxjs';
import { ClaimListAdditionalColumns, AdditionalColumnDefinition } from './claim-list-additional-columns';

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

  // Curated additional columns from registry
  availableAdditionalColumns: AdditionalColumnDefinition[] = [];
  selectedAdditionalColumns: Set<string> = new Set<string>(); // Track which additional columns are selected

  // Base columns (always visible by default)
  columns: Array<{
    key: string;
    label: string;
    visible: boolean;
    filterValue: string;
    isAdditionalColumn?: boolean; // Flag for columns added via Add Column
  }> = [
    { key: 'claID', label: 'Claim ID', visible: true, filterValue: '' },
    { key: 'claStatus', label: 'Status', visible: true, filterValue: '' },
    { key: 'claDateTimeCreated', label: 'Date Created', visible: true, filterValue: '' },
    { key: 'claTotalChargeTRIG', label: 'Total Charge', visible: true, filterValue: '' },
    { key: 'claTotalBalanceCC', label: 'Total Balance', visible: true, filterValue: '' },
    { key: 'claClassification', label: 'Facility', visible: false, filterValue: '' },
    { key: 'claFirstDateTRIG', label: '1st DOS', visible: false, filterValue: '' },
    { key: 'claLastDateTRIG', label: 'Last DOS', visible: false, filterValue: '' },
    { key: 'claBillTo', label: 'Bill To', visible: false, filterValue: '' },
    { key: 'claDateTimeModified', label: 'Modified Timestamp', visible: false, filterValue: '' },
    { key: 'claLastUserName', label: 'Modified User', visible: false, filterValue: '' },
    { key: 'claPatFID', label: 'Patient ID', visible: false, filterValue: '' },
    { key: 'claAttendingPhyFID', label: 'Attending Physician ID', visible: false, filterValue: '' },
    { key: 'claBillingPhyFID', label: 'Billing Physician ID', visible: false, filterValue: '' },
    { key: 'claBillDate', label: 'Bill Date', visible: false, filterValue: '' },
    { key: 'claTypeOfBill', label: 'Type of Bill', visible: false, filterValue: '' },
    { key: 'claAdmissionType', label: 'Admission Type', visible: false, filterValue: '' },
    { key: 'claPatientStatus', label: 'Patient Status', visible: false, filterValue: '' },
    { key: 'claDiagnosis1', label: 'Diagnosis 1', visible: false, filterValue: '' },
    { key: 'claDiagnosis2', label: 'Diagnosis 2', visible: false, filterValue: '' },
    { key: 'claDiagnosis3', label: 'Diagnosis 3', visible: false, filterValue: '' },
    { key: 'claDiagnosis4', label: 'Diagnosis 4', visible: false, filterValue: '' },
    { key: 'claReferringPhyFID', label: 'Referring Physician ID', visible: false, filterValue: '' },
    { key: 'claCreatedUserGUID', label: 'Created User GUID', visible: false, filterValue: '' },
    { key: 'claLastUserGUID', label: 'Last User GUID', visible: false, filterValue: '' },
    { key: 'claCreatedUserName', label: 'Created User Name', visible: false, filterValue: '' },
    { key: 'claCreatedComputerName', label: 'Created Computer Name', visible: false, filterValue: '' },
    { key: 'claLastComputerName', label: 'Last Computer Name', visible: false, filterValue: '' },
    { key: 'claAccidentDate', label: 'Accident Date', visible: false, filterValue: '' },
    { key: 'claAcuteManifestationDate', label: 'Acute Manifestation Date', visible: false, filterValue: '' },
    { key: 'claAdmissionHour', label: 'Admission Hour', visible: false, filterValue: '' },
    { key: 'claAdmissionSource', label: 'Admission Source', visible: false, filterValue: '' },
    { key: 'claAdmittedDate', label: 'Admitted Date', visible: false, filterValue: '' },
    { key: 'claAdmittingDiagnosis', label: 'Admitting Diagnosis', visible: false, filterValue: '' },
    { key: 'claArchived', label: 'Archived', visible: false, filterValue: '' },
    { key: 'claAssumedCareDate', label: 'Assumed Care Date', visible: false, filterValue: '' },
    { key: 'claAuthorizedReturnToWorkDate', label: 'Authorized Return To Work Date', visible: false, filterValue: '' },
    { key: 'claBox10dClaimCodes', label: 'Box 10d Claim Codes', visible: false, filterValue: '' },
    { key: 'claBox11bOtherClaimIDQualifier', label: 'Box 11b Other Claim ID Qualifier', visible: false, filterValue: '' },
    { key: 'claBox22CodeOverride', label: 'Box 22 Code Override', visible: false, filterValue: '' },
    { key: 'claBox33bOverride', label: 'Box 33b Override', visible: false, filterValue: '' },
    { key: 'claCLIANumber', label: 'CLIA Number', visible: false, filterValue: '' },
    { key: 'claCMNCertOnFile', label: 'CMN Cert On File', visible: false, filterValue: '' },
    { key: 'claCMNCertTypeCode', label: 'CMN Cert Type Code', visible: false, filterValue: '' },
    { key: 'claCMNFormIdentificationCode', label: 'CMN Form Identification Code', visible: false, filterValue: '' },
    { key: 'claCMNInitialDate', label: 'CMN Initial Date', visible: false, filterValue: '' },
    { key: 'claCMNLengthOfNeed', label: 'CMN Length Of Need', visible: false, filterValue: '' },
    { key: 'claCMNRevisedDate', label: 'CMN Revised Date', visible: false, filterValue: '' },
    { key: 'claCMNSignedDate', label: 'CMN Signed Date', visible: false, filterValue: '' },
    { key: 'claCN1Segment', label: 'CN1 Segment', visible: false, filterValue: '' },
    { key: 'claConditionCode1', label: 'Condition Code 1', visible: false, filterValue: '' },
    { key: 'claConditionCode2', label: 'Condition Code 2', visible: false, filterValue: '' },
    { key: 'claConditionCode3', label: 'Condition Code 3', visible: false, filterValue: '' },
    { key: 'claConditionCode4', label: 'Condition Code 4', visible: false, filterValue: '' },
    { key: 'claCustomField1', label: 'Custom Field 1', visible: false, filterValue: '' },
    { key: 'claCustomField2', label: 'Custom Field 2', visible: false, filterValue: '' },
    { key: 'claCustomField3', label: 'Custom Field 3', visible: false, filterValue: '' },
    { key: 'claCustomField4', label: 'Custom Field 4', visible: false, filterValue: '' },
    { key: 'claCustomField5', label: 'Custom Field 5', visible: false, filterValue: '' },
    { key: 'claDateLastSeen', label: 'Date Last Seen', visible: false, filterValue: '' },
    { key: 'claDateOfCurrent', label: 'Date Of Current', visible: false, filterValue: '' },
    { key: 'claDateTotalFrom', label: 'Date Total From', visible: false, filterValue: '' },
    { key: 'claDateTotalThrough', label: 'Date Total Through', visible: false, filterValue: '' },
    { key: 'claDelayCode', label: 'Delay Code', visible: false, filterValue: '' },
    { key: 'claDiagnosis5', label: 'Diagnosis 5', visible: false, filterValue: '' },
    { key: 'claDiagnosis6', label: 'Diagnosis 6', visible: false, filterValue: '' },
    { key: 'claDiagnosis7', label: 'Diagnosis 7', visible: false, filterValue: '' },
    { key: 'claDiagnosis8', label: 'Diagnosis 8', visible: false, filterValue: '' },
    { key: 'claDiagnosis9', label: 'Diagnosis 9', visible: false, filterValue: '' },
    { key: 'claDiagnosis10', label: 'Diagnosis 10', visible: false, filterValue: '' },
    { key: 'claDiagnosis11', label: 'Diagnosis 11', visible: false, filterValue: '' },
    { key: 'claDiagnosis12', label: 'Diagnosis 12', visible: false, filterValue: '' },
    { key: 'claDiagnosis13', label: 'Diagnosis 13', visible: false, filterValue: '' },
    { key: 'claDiagnosis14', label: 'Diagnosis 14', visible: false, filterValue: '' },
    { key: 'claDiagnosis15', label: 'Diagnosis 15', visible: false, filterValue: '' },
    { key: 'claDiagnosis16', label: 'Diagnosis 16', visible: false, filterValue: '' },
    { key: 'claDiagnosis17', label: 'Diagnosis 17', visible: false, filterValue: '' },
    { key: 'claDiagnosis18', label: 'Diagnosis 18', visible: false, filterValue: '' },
    { key: 'claDiagnosis19', label: 'Diagnosis 19', visible: false, filterValue: '' },
    { key: 'claDiagnosis20', label: 'Diagnosis 20', visible: false, filterValue: '' },
    { key: 'claDiagnosis21', label: 'Diagnosis 21', visible: false, filterValue: '' },
    { key: 'claDiagnosis22', label: 'Diagnosis 22', visible: false, filterValue: '' },
    { key: 'claDiagnosis23', label: 'Diagnosis 23', visible: false, filterValue: '' },
    { key: 'claDiagnosis24', label: 'Diagnosis 24', visible: false, filterValue: '' },
    { key: 'claDiagnosis25', label: 'Diagnosis 25', visible: false, filterValue: '' },
    { key: 'claDiagnosisCodesCC', label: 'Diagnosis Codes CC', visible: false, filterValue: '' },
    { key: 'claDisabilityBeginDate', label: 'Disability Begin Date', visible: false, filterValue: '' },
    { key: 'claDisabilityEndDate', label: 'Disability End Date', visible: false, filterValue: '' },
    { key: 'claDischargedDate', label: 'Discharged Date', visible: false, filterValue: '' },
    { key: 'claDischargedHour', label: 'Discharged Hour', visible: false, filterValue: '' },
    { key: 'claDMEFormData', label: 'DME Form Data', visible: false, filterValue: '' },
    { key: 'claEDINotes', label: 'EDI Notes', visible: false, filterValue: '' },
    { key: 'claEPSDTReferral', label: 'EPSDT Referral', visible: false, filterValue: '' },
    { key: 'claExternalFID', label: 'External FID', visible: false, filterValue: '' },
    { key: 'claFacilityPhyFID', label: 'Facility Physician ID', visible: false, filterValue: '' },
    { key: 'claFirstDateOfInjury', label: 'First Date Of Injury', visible: false, filterValue: '' },
    { key: 'claFirstInsPaymentDateTRIG', label: 'First Ins Payment Date TRIG', visible: false, filterValue: '' },
    { key: 'claHearingAndPrescriptionDate', label: 'Hearing And Prescription Date', visible: false, filterValue: '' },
    { key: 'claHomeboundInd', label: 'Homebound Ind', visible: false, filterValue: '' },
    { key: 'claHospiceInd', label: 'Hospice Ind', visible: false, filterValue: '' },
    { key: 'claICDIndicator', label: 'ICD Indicator', visible: false, filterValue: '' },
    { key: 'claIDENumber', label: 'IDE Number', visible: false, filterValue: '' },
    { key: 'claInitialTreatmentDate', label: 'Initial Treatment Date', visible: false, filterValue: '' },
    { key: 'claIgnoreAppliedAmount', label: 'Ignore Applied Amount', visible: false, filterValue: '' },
    { key: 'claInsuranceTypeCodeOverride', label: 'Insurance Type Code Override', visible: false, filterValue: '' },
    { key: 'claInvoiceNumber', label: 'Invoice Number', visible: false, filterValue: '' },
    { key: 'claK3FileInformation', label: 'K3 File Information', visible: false, filterValue: '' },
    { key: 'claLabCharges', label: 'Lab Charges', visible: false, filterValue: '' },
    { key: 'claLastExportedDate', label: 'Last Exported Date', visible: false, filterValue: '' },
    { key: 'claLastMenstrualDate', label: 'Last Menstrual Date', visible: false, filterValue: '' },
    { key: 'claLastPrintedDate', label: 'Last Printed Date', visible: false, filterValue: '' },
    { key: 'claLastWorkedDate', label: 'Last Worked Date', visible: false, filterValue: '' },
    { key: 'claLastXRayDate', label: 'Last X Ray Date', visible: false, filterValue: '' },
    { key: 'claLocked', label: 'Locked', visible: false, filterValue: '' },
    { key: 'claMammographyCert', label: 'Mammography Cert', visible: false, filterValue: '' },
    { key: 'claMedicalRecordNumber', label: 'Medical Record Number', visible: false, filterValue: '' },
    { key: 'claMedicaidResubmissionCode', label: 'Medicaid Resubmission Code', visible: false, filterValue: '' },
    { key: 'claMOASegment', label: 'MOA Segment', visible: false, filterValue: '' },
    { key: 'claOperatingPhyFID', label: 'Operating Physician ID', visible: false, filterValue: '' },
    { key: 'claOrderingPhyFID', label: 'Ordering Physician ID', visible: false, filterValue: '' },
    { key: 'claOriginalRefNo', label: 'Original Ref No', visible: false, filterValue: '' },
    { key: 'claOutsideLab', label: 'Outside Lab', visible: false, filterValue: '' },
    { key: 'claPaidDateTRIG', label: 'Paid Date TRIG', visible: false, filterValue: '' },
    { key: 'claPaperWorkControlNumber', label: 'Paper Work Control Number', visible: false, filterValue: '' },
    { key: 'claPaperWorkInd', label: 'Paper Work Ind', visible: false, filterValue: '' },
    { key: 'claPaperWorkTransmissionCode', label: 'Paper Work Transmission Code', visible: false, filterValue: '' },
    { key: 'claPatientReasonDiagnosis1', label: 'Patient Reason Diagnosis 1', visible: false, filterValue: '' },
    { key: 'claPatientReasonDiagnosis2', label: 'Patient Reason Diagnosis 2', visible: false, filterValue: '' },
    { key: 'claPatientReasonDiagnosis3', label: 'Patient Reason Diagnosis 3', visible: false, filterValue: '' },
    { key: 'claPOAIndicator', label: 'POA Indicator', visible: false, filterValue: '' },
    { key: 'claPPSCode', label: 'PPS Code', visible: false, filterValue: '' },
    { key: 'claPricingExceptionCode', label: 'Pricing Exception Code', visible: false, filterValue: '' },
    { key: 'claPrincipalProcedureCode', label: 'Principal Procedure Code', visible: false, filterValue: '' },
    { key: 'claPrincipalProcedureDate', label: 'Principal Procedure Date', visible: false, filterValue: '' },
    { key: 'claPrintUnitCharge', label: 'Print Unit Charge', visible: false, filterValue: '' },
    { key: 'claProviderAgreementCode', label: 'Provider Agreement Code', visible: false, filterValue: '' },
    { key: 'claRecurUntilDate', label: 'Recur Until Date', visible: false, filterValue: '' },
    { key: 'claRecurringTimeFrame', label: 'Recurring Time Frame', visible: false, filterValue: '' },
    { key: 'claReferralNumber', label: 'Referral Number', visible: false, filterValue: '' },
    { key: 'claRelatedTo', label: 'Related To', visible: false, filterValue: '' },
    { key: 'claRelatedToState', label: 'Related To State', visible: false, filterValue: '' },
    { key: 'claRelinquishedCareDate', label: 'Relinquished Care Date', visible: false, filterValue: '' },
    { key: 'claRemarks', label: 'Remarks', visible: false, filterValue: '' },
    { key: 'claRenderingPhyFID', label: 'Rendering Physician ID', visible: false, filterValue: '' },
    { key: 'claReserved10', label: 'Reserved 10', visible: false, filterValue: '' },
    { key: 'claReserved19', label: 'Reserved 19', visible: false, filterValue: '' },
    { key: 'claSimilarIllnessDate', label: 'Similar Illness Date', visible: false, filterValue: '' },
    { key: 'claSpecialProgramIndicator', label: 'Special Program Indicator', visible: false, filterValue: '' },
    { key: 'claStatementCoversFromOverride', label: 'Statement Covers From Override', visible: false, filterValue: '' },
    { key: 'claStatementCoversThroughOverride', label: 'Statement Covers Through Override', visible: false, filterValue: '' },
    { key: 'claSubmissionMethod', label: 'Submission Method', visible: false, filterValue: '' },
    { key: 'claSupervisingPhyFID', label: 'Supervising Physician ID', visible: false, filterValue: '' },
    { key: 'claTotalCOAdjTRIG', label: 'Total CO Adj TRIG', visible: false, filterValue: '' },
    { key: 'claTotalCRAdjTRIG', label: 'Total CR Adj TRIG', visible: false, filterValue: '' },
    { key: 'claTotalOAAdjTRIG', label: 'Total OA Adj TRIG', visible: false, filterValue: '' },
    { key: 'claTotalPIAdjTRIG', label: 'Total PI Adj TRIG', visible: false, filterValue: '' },
    { key: 'claTotalPRAdjTRIG', label: 'Total PR Adj TRIG', visible: false, filterValue: '' },
    { key: 'claTotalAdjCC', label: 'Total Adj CC', visible: false, filterValue: '' },
    { key: 'claTotalServiceLineCountTRIG', label: 'Total Service Line Count TRIG', visible: false, filterValue: '' },
    { key: 'claTotalInsAmtPaidTRIG', label: 'Total Ins Amt Paid TRIG', visible: false, filterValue: '' },
    { key: 'claTotalInsBalanceTRIG', label: 'Total Ins Balance TRIG', visible: false, filterValue: '' },
    { key: 'claTotalPatAmtPaidTRIG', label: 'Total Pat Amt Paid TRIG', visible: false, filterValue: '' },
    { key: 'claTotalPatBalanceTRIG', label: 'Total Pat Balance TRIG', visible: false, filterValue: '' },
    { key: 'claTotalAmtAppliedCC', label: 'Total Amt Applied CC', visible: false, filterValue: '' },
    { key: 'claTotalAmtPaidCC', label: 'Total Amt Paid CC', visible: false, filterValue: '' }
  ];

  constructor(
    private claimApiService: ClaimApiService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  currentPage: number = 1;
  pageSize: number = 25;

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    // Load curated additional columns from registry
    this.loadAdditionalColumnsFromRegistry();
    // Load saved column preferences
    this.loadColumnPreferences();
    // React to query param changes (e.g. patientId from ribbon Claim button)
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadClaims(this.currentPage, this.pageSize);
    });
  }

  /**
   * Load curated additional columns from the ClaimListAdditionalColumns registry.
   * NO dynamic schema discovery. NO reflection. NO auto-exposure.
   */
  loadAdditionalColumnsFromRegistry(): void {
    this.availableAdditionalColumns = ClaimListAdditionalColumns.getAllColumns();
    console.log(`Loaded ${this.availableAdditionalColumns.length} curated additional columns from registry`);
  }

  // Legacy method - no longer used (replaced by ClaimListAdditionalColumns registry)
  loadAvailableColumns(): void {
    // No-op: Columns are now loaded from the static registry
    console.log('loadAvailableColumns() is deprecated - using ClaimListAdditionalColumns registry');
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

    // Account # column filter (exact match – one or more selected values)
    if (this.columnValueFilters['patAccountNo'] && this.columnValueFilters['patAccountNo'].size > 0) {
      const accountValues = Array.from(this.columnValueFilters['patAccountNo']).filter(v => v !== '(Blank)');
      if (accountValues.length > 0) {
        // Single account: send exact match; multiple: backend could support list – for now use first (exact match)
        filters.patAccountNo = accountValues[0].trim();
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

    // Patient filter from query params (ribbon: Claim from Patient Details)
    const patientIdParam = this.route.snapshot.queryParamMap.get('patientId');
    if (patientIdParam) {
      const pid = parseInt(patientIdParam, 10);
      if (!isNaN(pid)) {
        filters.patientId = pid;
      }
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
      isAdditionalColumn: true
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

  // Legacy methods - no longer used (replaced by category-based registry)
  getRelatedColumnsByTable(): { [table: string]: any[] } {
    return {};
  }

  isRelatedColumnSelected(columnKey: string): boolean {
    return this.selectedAdditionalColumns.has(columnKey);
  }

  getVisibleRelatedColumns(): any[] {
    return [];
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

  /**
   * Toggle column visibility from the Add Column dropdown.
   * Only allows columns from the curated registry.
   */
  toggleColumnVisibility(columnKey: string): void {
    // Check if this is an additional column from the registry
    const additionalCol = ClaimListAdditionalColumns.findByKey(columnKey);
    
    if (additionalCol) {
      // Check if column already exists in columns array
      const existingCol = this.columns.find(c => c.key === columnKey);
      
      if (existingCol) {
        // Toggle visibility
        existingCol.visible = !existingCol.visible;
        
        // Update selected set
        if (existingCol.visible) {
          this.selectedAdditionalColumns.add(columnKey);
        } else {
          this.selectedAdditionalColumns.delete(columnKey);
        }
      } else {
        // Add new column to the grid
        this.columns.push({
          key: additionalCol.key,
          label: additionalCol.label,
          visible: true,
          filterValue: '',
          isAdditionalColumn: true
        });
        this.selectedAdditionalColumns.add(columnKey);
      }
      
      // Persist to localStorage
      this.saveColumnPreferences();
    } else {
      // Base column (not from additional registry)
    const col = this.columns.find(c => c.key === columnKey);
    if (col) {
      col.visible = !col.visible;
      }
    }
  }

  /**
   * Save column preferences to localStorage
   */
  saveColumnPreferences(): void {
    const preferences = {
      visibleColumns: this.columns.filter(c => c.visible).map(c => c.key),
      selectedAdditional: Array.from(this.selectedAdditionalColumns)
    };
    localStorage.setItem('claimListColumnPreferences', JSON.stringify(preferences));
  }

  /**
   * Load column preferences from localStorage
   */
  loadColumnPreferences(): void {
    const saved = localStorage.getItem('claimListColumnPreferences');
    if (saved) {
      try {
        const preferences = JSON.parse(saved);
        
        // Apply visibility to existing columns
        this.columns.forEach(col => {
          col.visible = preferences.visibleColumns.includes(col.key);
        });
        
        // Add additional columns that were previously selected
        if (preferences.selectedAdditional) {
          preferences.selectedAdditional.forEach((key: string) => {
            // Migrate legacy key: patFullName -> patFullNameCC (sync with backend)
            const resolvedKey = key === 'patFullName' ? 'patFullNameCC' : key;
            const additionalCol = ClaimListAdditionalColumns.findByKey(resolvedKey);
            if (additionalCol && !this.columns.find(c => c.key === resolvedKey)) {
              this.columns.push({
                key: additionalCol.key,
                label: additionalCol.label,
                visible: true,
                filterValue: '',
                isAdditionalColumn: true
              });
              this.selectedAdditionalColumns.add(resolvedKey);
            }
          });
        }
      } catch (e) {
        console.error('Error loading column preferences:', e);
      }
    }
  }

  clearAllColumns(): void {
    this.columns.forEach(col => col.visible = false);
  }

  /**
   * Get categories in the defined order
   */
  getAdditionalColumnCategories(): string[] {
    const categories = ClaimListAdditionalColumns.getCategoryOrder();
    
    // Filter by search text if provided
    if (this.columnSearchText.trim()) {
      const searchLower = this.columnSearchText.toLowerCase();
      return categories.filter(category => {
        const columnsInCategory = ClaimListAdditionalColumns.getAllColumns()
          .filter(col => col.category === category)
          .filter(col => col.label.toLowerCase().includes(searchLower));
        return columnsInCategory.length > 0;
      });
    }
    
    return categories;
  }

  /**
   * Get additional columns for a specific category
   */
  getAdditionalColumnsByCategory(category: string): AdditionalColumnDefinition[] {
    let columns = ClaimListAdditionalColumns.getAllColumns()
      .filter(col => col.category === category);
    
    // Apply search filter if provided
    if (this.columnSearchText.trim()) {
      const searchLower = this.columnSearchText.toLowerCase();
      columns = columns.filter(col => 
        col.label.toLowerCase().includes(searchLower)
      );
    }
    
    return columns;
  }

  /**
   * Check if an additional column is currently selected/visible
   */
  isAdditionalColumnSelected(key: string): boolean {
    const col = this.columns.find(c => c.key === key);
    return col ? col.visible : false;
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

