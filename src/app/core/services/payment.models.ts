export interface PaymentListItem {
  pmtID: number;
  pmtDateTimeCreated: string;
  pmtDate: string;
  pmtAmount: number;
  pmtPatFID: number;
  pmtPayFID: number | null;
  pmtBFEPFID: number;
  pmtMethod: string | null;
  pmtAuthCode: string | null;
  pmtNote: string | null;
  pmt835Ref: string | null;
  pmtDisbursedTRIG: number;
  pmtRemainingCC: number | null;
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
