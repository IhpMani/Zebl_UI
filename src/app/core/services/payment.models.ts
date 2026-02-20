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
