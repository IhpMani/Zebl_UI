import { ClaimStatusCategory } from '../utils/claim-status.util';

export interface PatientClaimRowDto {
  claimId: number;
  dos: string | null;
  payerName: string | null;
  status: string | null;
  statusCategory: ClaimStatusCategory;
  charges: number | null;
  insurancePaid: number | null;
  patientPaid: number | null;
  balance: number | null;
  balanceOverdue: boolean;
}
