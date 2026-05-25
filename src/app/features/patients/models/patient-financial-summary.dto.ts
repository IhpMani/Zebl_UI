export interface PatientFinancialSummaryDto {
  patientBalance: number;
  insuranceBalance: number;
  totalBalance: number;
  unappliedPayments?: number;
  inCollections: boolean;
  aging0To30: number | null;
  aging31To60: number | null;
  aging61To90: number | null;
  aging91To120: number | null;
  aging120Plus: number | null;
}
