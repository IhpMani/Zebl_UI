export interface PaymentListItem {
  pmtID: number;
  pmtDateTimeCreated: string;
  pmtDateTimeModified: string;
  pmtCreatedUserName: string | null;
  pmtLastUserName: string | null;
  pmtDate: string;
  pmtAmount: number;
  pmtRemainingCC: number | null;
  pmtChargedPlatformFee: number;
  pmtMethod: string | null;
  pmtNote: string | null;
  pmt835Ref: string | null;
  pmtOtherReference1: string | null;
  pmtPatFID: number;
  pmtPayFID: number | null;
  pmtPayerName: string | null;
  payClassification: string | null;
  patAccountNo: string | null;
  patLastName: string | null;
  patFirstName: string | null;
  patFullNameCC: string | null;
  patClassification: string | null;
  pmtBFEPFID?: number;
  pmtAuthCode?: string | null;
  pmtDisbursedTRIG?: number;
  additionalColumns?: { [key: string]: any };
}

export interface PaymentsApiResponse {
  data: PaymentListItem[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
}

/** Payment data for edit form (GET /api/payments/:id). */
export interface PaymentForEdit {
  paymentId: number;
  paymentSource: 0 | 1; // 0 Patient, 1 Payer
  payerId: number | null;
  patientId: number;
  amount: number;
  date: string; // ISO date
  method: string | null;
  reference1: string | null;
  reference2: string | null;
  note: string | null;
  remaining: number | null;
}

/** One row for the payment entry grid (from GET /api/payments/service-lines). */
export interface PaymentEntryServiceLine {
  serviceLineId: number;
  name: string | null;
  dos: string | null;
  proc: string | null;
  charge: number;
  responsible: string | null;
  applied: number;
  balance: number;
}

/** User input per adjustment slot (UI only; backend gets groupCode, reasonCode, amount). */
export interface AdjustmentInput {
  groupCode?: string;
  reasonCode?: string;
  amount?: number;
}

/** Payment entry grid row: API data + user-editable paid amount and adjustments. No financial math in UI. */
export interface PaymentEntryRow extends PaymentEntryServiceLine {
  paidAmount: number;
  adjustments: AdjustmentInput[];
}
