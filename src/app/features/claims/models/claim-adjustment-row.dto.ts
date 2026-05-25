export interface ClaimAdjustmentRowDto {
  adjustmentId: number;
  serviceLineId: number;
  groupCode: string | null;
  reasonCode: string | null;
  remarkCode: string | null;
  amount: number;
  payer: string | null;
  eraRef: string | null;
  date: string | null;
}
