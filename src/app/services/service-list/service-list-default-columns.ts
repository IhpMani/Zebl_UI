export interface ServiceListColumnDef {
  key: string;
  label: string;
  visible: boolean;
  filterValue: string;
  isRelatedColumn?: boolean;
  table?: string;
}

export const SERVICE_LIST_COLUMN_PREFS_KEY = 'serviceListColumnPreferences';
export const SERVICE_LIST_COLUMN_PREFS_VERSION = 1;

/** Default visible column keys on first visit (no saved preferences). */
export const SERVICE_LIST_DEFAULT_VISIBLE_KEYS = [
  'srvID',
  'srvClaFID',
  'createdDate',
  'srvFromDate',
  'srvToDate',
  'srvProcedureCode',
  'srvDesc',
  'srvCharges',
  'srvTotalBalanceCC'
] as const;

export const DEFAULT_SERVICE_LIST_COLUMNS: ServiceListColumnDef[] = [
  { key: 'srvID', label: 'Service ID', visible: true, filterValue: '' },
  { key: 'srvClaFID', label: 'Claim ID', visible: true, filterValue: '' },
  { key: 'createdDate', label: 'Date Created', visible: true, filterValue: '' },
  { key: 'srvFromDate', label: 'From Date', visible: true, filterValue: '' },
  { key: 'srvToDate', label: 'To Date', visible: true, filterValue: '' },
  { key: 'srvProcedureCode', label: 'Procedure Code', visible: true, filterValue: '' },
  { key: 'srvDesc', label: 'Description', visible: true, filterValue: '' },
  { key: 'srvCharges', label: 'Charges', visible: true, filterValue: '' },
  { key: 'srvUnits', label: 'Units', visible: false, filterValue: '' },
  { key: 'srvTotalBalanceCC', label: 'Total Balance', visible: true, filterValue: '' },
  { key: 'srvTotalAmtPaidCC', label: 'Amount Paid', visible: false, filterValue: '' },
  { key: 'modifiedDate', label: 'Date Modified', visible: false, filterValue: '' },
  { key: 'srvCreatedUserGUID', label: 'Created User GUID', visible: false, filterValue: '' },
  { key: 'srvLastUserGUID', label: 'Last User GUID', visible: false, filterValue: '' },
  { key: 'srvCreatedUserName', label: 'Created User Name', visible: false, filterValue: '' },
  { key: 'srvLastUserName', label: 'Last User Name', visible: false, filterValue: '' },
  { key: 'srvCreatedComputerName', label: 'Created Computer Name', visible: false, filterValue: '' },
  { key: 'srvLastComputerName', label: 'Last Computer Name', visible: false, filterValue: '' },
  { key: 'srvAllowedAmt', label: 'Allowed Amt', visible: false, filterValue: '' },
  { key: 'srvApprovedAmt', label: 'Approved Amt', visible: false, filterValue: '' },
  { key: 'srvAttachCMN', label: 'Attach CMN', visible: false, filterValue: '' },
  { key: 'srvAuthorizationOverride', label: 'Authorization Override', visible: false, filterValue: '' },
  { key: 'srvCoPayAmountDue', label: 'Co Pay Amount Due', visible: false, filterValue: '' },
  { key: 'srvCost', label: 'Cost', visible: false, filterValue: '' },
  { key: 'srvCustomField1', label: 'Custom Field 1', visible: false, filterValue: '' },
  { key: 'srvCustomField2', label: 'Custom Field 2', visible: false, filterValue: '' },
  { key: 'srvCustomField3', label: 'Custom Field 3', visible: false, filterValue: '' },
  { key: 'srvCustomField4', label: 'Custom Field 4', visible: false, filterValue: '' },
  { key: 'srvCustomField5', label: 'Custom Field 5', visible: false, filterValue: '' },
  { key: 'srvDiagnosisPointer', label: 'Diagnosis Pointer', visible: false, filterValue: '' },
  { key: 'srvDrugUnitCount', label: 'Drug Unit Count', visible: false, filterValue: '' },
  { key: 'srvDrugUnitMeasurement', label: 'Drug Unit Measurement', visible: false, filterValue: '' },
  { key: 'srvDrugUnitPrice', label: 'Drug Unit Price', visible: false, filterValue: '' },
  { key: 'srvEMG', label: 'EMG', visible: false, filterValue: '' },
  { key: 'srvEndTime', label: 'End Time', visible: false, filterValue: '' },
  { key: 'srvEPSDT', label: 'EPSDT', visible: false, filterValue: '' },
  { key: 'srvExpectedPriPmt', label: 'Expected Pri Pmt', visible: false, filterValue: '' },
  { key: 'srvFirstInsPaymentDateTRIG', label: 'First Ins Payment Date TRIG', visible: false, filterValue: '' },
  { key: 'srvGUID', label: 'GUID', visible: false, filterValue: '' },
  { key: 'srvK3FileInformation', label: 'K3 File Information', visible: false, filterValue: '' },
  { key: 'srvModifier1', label: 'Modifier 1', visible: false, filterValue: '' },
  { key: 'srvModifier2', label: 'Modifier 2', visible: false, filterValue: '' },
  { key: 'srvModifier3', label: 'Modifier 3', visible: false, filterValue: '' },
  { key: 'srvModifier4', label: 'Modifier 4', visible: false, filterValue: '' },
  { key: 'srvNationalDrugCode', label: 'National Drug Code', visible: false, filterValue: '' },
  { key: 'srvNonCoveredCharges', label: 'Non Covered Charges', visible: false, filterValue: '' },
  { key: 'srvPatBalanceReasonCode', label: 'Pat Balance Reason Code', visible: false, filterValue: '' },
  { key: 'srvPlace', label: 'Place', visible: false, filterValue: '' },
  { key: 'srvPrescriptionNumber', label: 'Prescription Number', visible: false, filterValue: '' },
  { key: 'srvPrintLineItem', label: 'Print Line Item', visible: false, filterValue: '' },
  { key: 'srvProductCode', label: 'Product Code', visible: false, filterValue: '' },
  { key: 'srvRespChangeDate', label: 'Resp Change Date', visible: false, filterValue: '' },
  { key: 'srvResponsibleParty', label: 'Responsible Party', visible: false, filterValue: '' },
  { key: 'srvRevenueCode', label: 'Revenue Code', visible: false, filterValue: '' },
  { key: 'srvSortTiebreaker', label: 'Sort Tiebreaker', visible: false, filterValue: '' },
  { key: 'srvStartTime', label: 'Start Time', visible: false, filterValue: '' },
  { key: 'srvTotalCOAdjTRIG', label: 'Total CO Adj TRIG', visible: false, filterValue: '' },
  { key: 'srvTotalCRAdjTRIG', label: 'Total CR Adj TRIG', visible: false, filterValue: '' },
  { key: 'srvTotalOAAdjTRIG', label: 'Total OA Adj TRIG', visible: false, filterValue: '' },
  { key: 'srvTotalPIAdjTRIG', label: 'Total PI Adj TRIG', visible: false, filterValue: '' },
  { key: 'srvTotalPRAdjTRIG', label: 'Total PR Adj TRIG', visible: false, filterValue: '' },
  { key: 'srvTotalInsAmtPaidTRIG', label: 'Total Ins Amt Paid TRIG', visible: false, filterValue: '' },
  { key: 'srvTotalPatAmtPaidTRIG', label: 'Total Pat Amt Paid TRIG', visible: false, filterValue: '' },
  { key: 'srvPerUnitChargesCC', label: 'Per Unit Charges CC', visible: false, filterValue: '' },
  { key: 'srvModifiersCC', label: 'Modifiers CC', visible: false, filterValue: '' },
  { key: 'srvRespDaysAgedCC', label: 'Resp Days Aged CC', visible: false, filterValue: '' },
  { key: 'srvTotalAdjCC', label: 'Total Adj CC', visible: false, filterValue: '' },
  { key: 'srvTotalOtherAdjCC', label: 'Total Other Adj CC', visible: false, filterValue: '' },
  { key: 'srvTotalAmtAppliedCC', label: 'Total Amt Applied CC', visible: false, filterValue: '' },
  { key: 'srvTotalInsBalanceCC', label: 'Total Ins Balance CC', visible: false, filterValue: '' },
  { key: 'srvTotalPatBalanceCC', label: 'Total Pat Balance CC', visible: false, filterValue: '' },
  { key: 'srvTotalMinutesCC', label: 'Total Minutes CC', visible: false, filterValue: '' },
  { key: 'srvAdditionalData', label: 'Additional Data', visible: false, filterValue: '' },
  { key: 'srvNOCOverride', label: 'NOC Override', visible: false, filterValue: '' }
];

export function cloneDefaultServiceListColumns(): ServiceListColumnDef[] {
  return DEFAULT_SERVICE_LIST_COLUMNS.map((col) => ({ ...col }));
}
