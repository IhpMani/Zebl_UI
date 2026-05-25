export interface ClaimPaymentRowDto {
  paymentId: number;
  serviceLineId: number | null;
  paymentDate: string | null;
  amount: number | null;
  method: string | null;
  eraRef: string | null;
  unappliedAmount: number | null;
}
