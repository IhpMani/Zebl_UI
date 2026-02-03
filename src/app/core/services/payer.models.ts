export interface PayerListItem {
  payID: number;
  payDateTimeCreated: string;
  payName: string | null;
  payExternalID: string | null;
  payCity: string | null;
  payState: string | null;
  payPhoneNo: string | null;
  payInactive: boolean;
  payClaimType: string;
  paySubmissionMethod: string;
  additionalColumns?: { [key: string]: any };
}

export interface PayersApiResponse {
  data: PayerListItem[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
}
