export interface ClaimFinancialSummaryDto {
  totalCharges: number;
  insurancePaid: number;
  patientPaid: number;
  adjustments: number;
  writeOffs: number;
  remainingInsurance: number;
  remainingPatient: number;
  totalApplied: number;
  undistributedPayments: number;
  totalBalance: number;
}
