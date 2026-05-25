/** Ultra-light balance snapshot for overview metrics. */
export interface PatientBalanceSummaryDto {
  patientBalance: number;
  insuranceBalance: number;
  totalBalance: number;
  inCollections: boolean;
}
