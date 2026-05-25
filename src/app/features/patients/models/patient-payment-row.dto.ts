export interface PatientPaymentRowDto {
  paymentId: number;
  paymentDate: string | null;
  paymentType: string | null;
  payerName: string | null;
  amount: number | null;
  unappliedAmount: number | null;
}
