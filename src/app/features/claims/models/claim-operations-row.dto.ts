import { ClaimStatusCategory } from '../utils/claim-status.util';

export interface ClaimOperationsRowDto {
  claimId: number;
  patientName: string | null;
  dos: string | null;
  payer: string | null;
  status: string | null;
  statusCategory: ClaimStatusCategory;
  charges: number | null;
  insuranceBalance: number | null;
  patientBalance: number | null;
  totalBalance: number | null;
  lastActivity: string | null;
  agingDays: number | null;
  isRts: boolean;
  ediStatus: string | null;
}
