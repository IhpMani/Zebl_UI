export interface PatientRecentPaymentDto {
  paymentId: number;
  paymentDate: string | null;
  paymentType: string | null;
  amount: number | null;
}
