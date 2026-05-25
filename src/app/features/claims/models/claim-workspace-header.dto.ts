import { ClaimStatusCategory } from '../utils/claim-status.util';

export interface ClaimWorkspaceHeaderDto {
  claimId: number;
  patientId: number | null;
  patientName: string | null;
  accountNo: string | null;
  dos: string | null;
  primaryPayer: string | null;
  status: string | null;
  statusCategory: ClaimStatusCategory;
  claimType: string | null;
  totalCharges: number | null;
  insuranceBalance: number | null;
  patientBalance: number | null;
  totalBalance: number | null;
  lastActivity: string | null;
  lastEdiEvent: string | null;
  agingDays: number | null;
}
