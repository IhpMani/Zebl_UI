export interface PatientInsuranceSummaryDto {
  primaryPayer: string | null;
  secondaryPayer: string | null;
  subscriberName: string | null;
  groupNumber: string | null;
  planName: string | null;
  effectiveDate: string | null;
  eligibilityStatus: string | null;
}
