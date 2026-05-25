export interface ClaimServiceLineRowDto {
  serviceLineId: number;
  dos: string | null;
  procedureCode: string | null;
  modifiers: string | null;
  units: number | null;
  charges: number | null;
  allowed: number | null;
  insurancePaid: number | null;
  patientPaid: number | null;
  adjustments: number | null;
  remainingBalance: number | null;
  responsibleParty: string | null;
  agingDays: number | null;
  hasDenial: boolean;
  adjustmentCount: number;
  paymentCount: number;
}
