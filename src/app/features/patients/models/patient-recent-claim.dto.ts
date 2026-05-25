export interface PatientRecentClaimDto {
  claimId: number;
  dos: string | null;
  status: string | null;
  charges: number | null;
  insurancePaid: number | null;
  patientPaid: number | null;
  balance: number | null;
}
